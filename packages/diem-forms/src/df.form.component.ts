/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable sonarjs/cognitive-complexity */
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { AbstractControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { cloneDeep, findIndex, isEmpty, isEqual, reduce } from 'lodash-es';
import { select, Store } from '@ngrx/store';
import { utc } from 'moment';
import { debounceTime, distinctUntilChanged, filter, take } from 'rxjs/operators';
import { DFCommonService } from './df.common.api';
import { DFFilterService } from './df.filter.service';
import { DFQuestionControlService } from './df.question.control.service';
import { DFStoreFunctions } from './df.store.functions';
import { QuestionBase } from './definitions/question-base';
import { QuestionGroup } from './definitions/question-group';
import { IAction, IForm, IFormSpecs, IStoreFormState } from './definitions/interfaces';
import { tmpl } from './templates/df.form.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DFQuestionControlService],
    selector: 'df-form',
    template: tmpl,
})
export class DFComponent implements AfterViewInit, OnInit, OnDestroy {
    @Input() public questionGroups!: QuestionGroup<any>; /** ! Added Later */
    @Input() public inputValues: any;
    @Input() public locals!: IForm; /** ! Added Later */
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */

    public form!: FormGroup; /** ! Added Later */
    public savedForm?: FormGroup;
    public TimeCheck: number = new Date().getTime();
    public validations: QuestionBase<any>[] = [];

    public questions: QuestionBase<any>[] = [];
    public keyNames: string[] = [];
    public storeData: any;
    public storeName?: string;
    public env: Env;
    public values: any;
    public loaded: boolean; // used for indicating the componet has loaded data from the server

    private storeValues: any;
    private oldValues: any;
    private FSStore!: Subscription; /** ! Added Later */
    private formSubscription!: Subscription; /** ! Added Later */
    private AStore!: Subscription; /** ! added later */
    private RStore!: Subscription; /** ! added later */
    private FStore!: Subscription; /** ! added later */
    private VStore!: Subscription; /** ! added later */
    private TStore!: Subscription; /** ! added later */
    private cd: ChangeDetectorRef;
    private fs: DFFilterService;
    private qcs: DFQuestionControlService;
    private store: Store<any>;
    private DSF: DFStoreFunctions;
    private DFCS: DFCommonService;
    private oldForm?: FormGroup; /** ! Added Later */

    public constructor(
        env: Env,
        cd: ChangeDetectorRef,
        fs: DFFilterService,
        qcs: DFQuestionControlService,
        store: Store<any>,
        DSF: DFStoreFunctions,
        DFCS: DFCommonService
    ) {
        this.env = env;
        this.cd = cd;
        this.fs = fs;
        this.qcs = qcs;
        this.store = store;
        this.DSF = DSF;
        this.DFCS = DFCS;
        this.loaded = false;
        this.storeValues = {};
    }

    public ngOnInit(): void {
        console.info(`$df.form.component (ngOnInit): Started  => ${this.locals.formName}`);

        /**
         * we only need to do this for form that need to toggle between read and edit
         * other we leave it as it is, that is there is no flag on the readmode in locals
         */
        if (this.locals && this.locals.readmode) {
            this.readMode();
        }

        if (this.locals && this.locals.editmode) {
            this.editMode();
        }

        this.setForm();

        /** get the real name of the store (adds a url path) */
        if (this.locals.store) {
            this.storeName = this.DSF.r_getStore(this.locals.store);
        }

        /**
         * if the config locals contains the reset flag , then reset all values
         * values are normally retained in the questions object
         */
        if (this.locals && this.locals.reset) {
            this.resetQuestions(this.locals.reset);
        }

        /** Listen to any incomming messages from other forms
         * and update the values
         */
        this.formSubscribe();

        /** if the data are to be found in the store, then get them from that store */
        if (this.locals.fromStore) {
            this.fromStores();
        } else {
            this.loaded = true;
        }

        /** if data are required from any store , then get them here
         * this needs to be after from store so that we don't load data twice
         */
        if (this.locals.required) {
            this.requiredFromStore();
        }

        /** if the data are to be found in the store, then get them from that store */
        if (this.locals.fromServer) {
            if (this.locals.fromStore && !this.values) {
                this.values = this.storeValues.values;
            }
            this.fromServer();
        }

        if (this.values && this.locals.toStore) {
            this.toStore(this.values);
        }

        this.check('ngOnInit');
        console.info(`$df.form.component (ngOnInit): Completed  => ${this.locals.formName}`);
    }

    public ngAfterViewInit(): any {
        /** listen to changes */
        this.watchChanges();
    }

    public setForm(): void {
        this.form = this.qcs.toFormGroup(this.questionGroups, this.validations, this.questions, this.keyNames);

        if (this.locals.prevalidate) {
            this.qcs.markFormGroupTouched(this.form);
        }

        if (this.inputValues) {
            this.values = { ...this.inputValues };
            this.setDefaultValues();
        }

        this.questions.forEach((q: QuestionBase<any>) => {
            if (q.key) {
                this.form.value[q.key] = q.value;
            }
        });

        if (this.locals && this.locals.values && !isEmpty(this.locals.values)) {
            this.patchValues(cloneDeep(this.locals.values));
        }

        this.checkRequires();
    }

    public formSubscribe = (): void => {
        this.formSubscription = this.DFCS.form$.subscribe((action: IAction) => {
            if (action.target && action.target === this.locals.formName) {
                if (action.type === 'filter') {
                    this.onFilter(action.values, action.reset);
                } else if (action.type === 'edit') {
                    this.onEdit();
                } else if (action.type === 'values' && action.values) {
                    this.onValues(action.values);
                } else if (action.type === 'read') {
                    this.readMode();
                } else if (action.type === 'cancel') {
                    this.onCancel();
                }
            }
        });
    };

    public fromStores = () => {
        if (Array.isArray(this.locals.store)) {
            this.locals.store.forEach((store) => {
                const storeName: string = this.DSF.r_getStore(store);
                this.fromStore(storeName);
            });
        } else {
            if (this.storeName) {
                this.fromStore(this.storeName);
            }
        }

        /* data can come from the backend and tell us if loaded
            but sometimes are not yet from the backend and therefore we can set loaded to true
        */

        if (this.locals.loaded) {
            this.loaded = true;
        }
    };

    /**
     * here we load data from a store if the fromStore is set
     * We do this only if the formname is different from the local name to avoid getting
     * into a loop because of the value changes;
     *
     * @returns {*}
     *
     * @memberOf DFComponent
     */
    public fromStore = (store: string): any => {
        this.FStore = this.store
            .pipe(
                select((s) => s.coverage.states[store]),
                filter((d: any) => d !== undefined),
                distinctUntilChanged()
            )
            // eslint-disable-next-line sonarjs/cognitive-complexity, complexity
            .subscribe((data: any) => {
                if (data.values !== undefined && !isEqual(this.storeValues, data)) {
                    /*  tslint:disable:cyclomatic-complexity */

                    console.info(`$df.form.component (fromStore) => ${this.locals.formName}`);
                    /** date from the server have a loaded flag, we set the component loaded flag to true */
                    if (data.loaded) {
                        this.loaded = true;
                    }

                    /** to avoid the form to update itself with the onchanges listerner we set a block to true */

                    /** make the values immutable */
                    this.storeValues = cloneDeep(data);

                    let values: any = cloneDeep(data.values);

                    /**
                     * data can be loaded from the store but also from the form itself that dispatches
                     * the fromStore can be a boolean but also an object
                     * we can use this to only let values in from a specific store
                     * that means our store can be updated without the front end store being updated
                     */

                    if (this.locals.fromStore && typeof this.locals.fromStore !== 'boolean') {
                        const storeName: string | undefined = this.DSF.r_getStore(this.locals.fromStore);
                        if (storeName && data.target !== storeName) {
                            return;
                        }
                    }

                    /** allow only spefic values */
                    if (this.locals.input) {
                        const flatValues: any = this.DSF.flatten(values);

                        values = reduce(
                            this.locals.input,
                            (memo, _value, key) => {
                                const t: { [index: string]: any } = memo;
                                t[key] = flatValues[key];

                                return t;
                            },
                            {}
                        );
                    }

                    /**
                     * This code is used to set a field value from a different based on the fact if another form is valid or not
                     */
                    if (values && data.form.name && data.form.name !== '') {
                        // only if we have values

                        /** find out of there's a filed that has a key with name of the form to check */
                        const i: number = this.findIdx(this.questions, 'label', data.form.name);

                        if (i > -1) {
                            // the form needs to have a name

                            const key: string | undefined = this.questions[i].key;
                            if (key) {
                                values[key] = data.form.valid ? data.form.valid : '';
                            }
                        } else {
                            const t: number = this.findIdx(this.questions, 'label', 'form');
                            if (t > -1) {
                                // the form needs to have a name
                                const key: string | undefined = this.questions[t].key;
                                if (key) {
                                    values[key] = data.form.valid ? data.form.valid : '';
                                }
                            }
                        }
                    }

                    if (this.locals.map) {
                        const pvalues: any = cloneDeep(values);

                        this.locals.map.fields.forEach((f: any) => {
                            if (f.date && values[f.in]) {
                                values[f.in] = utc(pvalues[f.out]).toDate();
                            } else {
                                this.setPath(f.in, pvalues[f.out], undefined, values);
                            }
                        });
                    }

                    if (!isEmpty(values)) {
                        this.patchValues(values);
                    }

                    this.check('fromStore');
                } else if (data !== undefined && this.loaded !== data.loaded && !this.locals.fromServer) {
                    /** we do an additional check if this.loaded is equal to store loaded */
                    this.loaded = true;
                    this.check('fromStore');
                }
            });
    };

    public requiredFromStore = (): any => {
        const required: any = this.locals.required;
        this.RStore = this.store
            .pipe(select((s) => s.coverage.states[this.DSF.r_getStore(required.store)]))
            .subscribe((data: any) => {
                /** we need to have data AND the data are not already loaded from the sever */

                if (data !== undefined && !isEmpty(data.values)) {
                    let values: any = {};

                    if (required.fields) {
                        let pvalues: any = cloneDeep(data.values);

                        if (required.flatten) {
                            pvalues = this.DSF.flatten(pvalues);
                        }

                        required.fields.forEach((f: any) => {
                            if (f.date) {
                                const d: Date = utc(pvalues[f.out]).toDate();
                                const offset: number = new Date().getTimezoneOffset() * -1 * 60 * 1000;
                                values[f.in] = new Date(d.getTime() + offset);
                            } else {
                                this.setPath(f.in, pvalues[f.out], undefined, values);
                            }
                        });
                    } else {
                        values = data.values;
                    }

                    this.patchValues(values);

                    /** if there's an url in the locals it means we have now a key from the store ad can load the form */
                    if (this.storeName && this.locals.url && !this.loaded) {
                        this.DSF.loadForm(
                            {
                                query: values,
                            },
                            this.locals,
                            this.storeName
                        );
                    }
                }
            });
    };

    public fromServer = (): void => {
        if (this.storeName) {
            this.DSF.loadForm(
                (this.values = this.DSF.OA(this.values, this.locals.params)),
                this.locals,
                this.storeName
            );
        }
    };

    public toStore = (data: any) => {
        if (isEqual(this.storeValues, data)) {
            return;
        }

        let nvalues: any;
        if (this.locals.output) {
            nvalues = reduce(
                this.locals.output,
                (memo: any, _value, key) => {
                    memo[key] = this.form.value[key];

                    return memo;
                },
                {}
            );
        } else {
            nvalues = this.form.value;
        }

        const values: any = this.DSF.OA(this.storeValues.values, nvalues);

        const form: IStoreFormState = {
            error: false,
            form: {
                name: this.locals.formName,
                valid: this.form.valid,
            },
            loaded: true,
            store: this.storeName || 'foo',
            target: this.storeName,
            values,
        };

        /** create a block so that the component will not update itself from the from store
         */
        if (isEqual(this.storeValues, form)) {
            return;
        }
        this.patchValues(values);
        this.storeValues = cloneDeep(form);
        console.info(`$df.form.component (toStore) => ${this.locals.formName}`);
        this.DSF.updateForm(form);
    };

    public watchChanges(): void {
        this.VStore = this.form.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe((data: any) => {
            if (!data) {
                return;
            }

            /** if data are to be loaded into the store then enable this option */
            if (this.locals.toStore) {
                this.toStore(data);
            }
            this.check('valuechanges');
        });
    }

    public setDefaultValues = (): void => {
        const vals: any = this.locals.input ? this.reduce(this.locals.input) : this.values;
        this.patchValues(vals);
    };

    /**
     * a function to flatten values
     *
     * @memberOf DFComponent
     */

    public onSubmit = (val: boolean = false): void => {
        this.DFCS.formChanged({ action: 'submit', values: this.emitValues() });

        if (val) {
            this.form.reset(true);
        } else {
            this.formSpecs.submitted = true;
            this.readMode();
        }
    };

    public onSave = (val: boolean = false, diff: boolean = false): void => {
        if (val) {
            this.readMode();
        }
        if (diff) {
            this.DFCS.formChanged({ action: 'save', values: this.diff(this.emitValues(), this.oldValues) });
        } else {
            this.DFCS.formChanged({ action: 'save', values: this.emitValues() });
        }
    };

    public readMode = (): void => {
        if (!this.formSpecs.readmode) {
            this.formSpecs.readmode = true;
        }

        console.info(`$df.form.component (readMode) => ${this.locals.formName}`);
        // this.check('readMode');
        this.removeBodyClass('editmode');
    };

    public editMode = (): void => {
        if (this.formSpecs.readmode) {
            this.formSpecs.readmode = false;
        }
        console.info(`$df.form.component (editMode) => ${this.locals.formName}`);
        // this.check('editMode');
        this.setBodyClass('editmode');
    };

    public onEdit = (): void => {
        this.oldForm = cloneDeep(this.form);
        this.oldValues = this.oldForm.value;
        this.DFCS.formChanged({ action: 'edit', values: this.emitValues() });

        // here a little hack, the radio buttons didn't show checked or not , so far only this solves it
        this.form.patchValue({});
        this.editMode();
    };

    public onReset = (): void => {
        this.form.reset(this.values);
    };

    public onCancel = (): void => {
        if (this.oldForm) {
            this.form = cloneDeep(this.oldForm);
        }
        if (this.oldForm && this.oldForm.value) {
            this.toStore(this.oldForm.value);
        }
        this.DFCS.formChanged({ action: 'cancel', values: this.emitValues() });
        if (this.oldForm) {
            this.oldForm = undefined;
        }

        this.readMode();
    };

    public onValues = (values: any): void => {
        this.patchValues(values);
    };

    public onDelete = (): void => {
        this.form.reset(true);
        this.DFCS.formChanged({ action: 'delete', values: this.emitValues() });
        this.readMode();
    };

    /**
     * this code is triggered external by evaluating an onclick on a form button
     * action
     *
     * @param action
     */
    public onAction = (action: IAction): void => {
        const vals: any = this.locals.output ? this.reduce(this.locals.output) : this.emitValues();

        this.DFCS.formChanged({ action, values: vals, params: this.locals.params || undefined });
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public reduce = (vals: any) =>
        reduce(
            vals,
            (memo: any, _value, key) => {
                /* this is diff  */
                const obj: any = this.emitValues();
                memo[key] = obj[key];

                return memo;
            },
            {}
        );

    public checkRequires = (): void => {
        if (this.form) {
            this.questions.forEach((q: QuestionBase<any>) => {
                if (q.key && q.requiredWhen && typeof q.requiredWhen === 'string') {
                    const q1: AbstractControl | null = this.form.get(q.key);
                    if (q1 && q1.validator === null) {
                        const required: boolean = this.evalStr(q.requiredWhen);
                        if (required) {
                            console.info(`$df.form.component ( checkErrors) => requiring: ${q.key}`);
                            q1.setValidators([Validators.required]);
                            this.validations.push(q);
                        }
                    }
                }
            });
        }
    };

    public evalStr = (str: string): any => Function(`"use strict";return (${str})`).call(this);

    public questionsVisible: any = (questions: any[]): boolean => {
        for (const question of questions) {
            if (!question.hidden) {
                return true;
            }
        }

        return false;
    };

    public resetQuestions(reset: boolean | any): void {
        const nvalues: any = {};

        if (Array.isArray(reset)) {
            reset.forEach((key: string) => {
                nvalues[key] = this.form.value[key];
            });
        }

        if (this.storeName) {
            this.DSF.resetFormStore(this.storeName, {
                form: {
                    name: this.locals.formName || '',
                    valid: !!this.form.valid,
                },
                values: nvalues,
            });
        }

        this.form.reset(nvalues);
    }

    public getStoreSubscription(): any {
        const store: string | undefined = this.locals.filterStore
            ? this.DSF.r_getStore(this.locals.filterStore)
            : this.storeName;

        if (store) {
            let subscription: any;
            this.FSStore = this.store
                .pipe(
                    select((s) => s.coverage.states[store]),
                    take(1)
                ) // only subscribe once
                .subscribe((data: any) => {
                    subscription = data;
                });

            return subscription;
        }

        return {};
    }

    public onFilter = (keys: string[], reset: boolean | string[] = false): any => {
        /* tslint:disable:no-parameter-reassignment */
        keys = !keys ? this.keyNames : keys;

        const filterValues: any = cloneDeep(this.getStoreSubscription());

        if (filterValues && filterValues.query) {
            const query: any = filterValues.query;
            for (const key in keys) {
                if (Object.prototype.hasOwnProperty.call(keys, key)) {
                    if (Object.prototype.hasOwnProperty.call(this.form.controls, key)) {
                        const t: any = this.form.controls[key];
                        query[key] = !t.disabled ? (t.value && t.value !== '' ? t.value : undefined) : undefined;
                    }

                    if (reset) {
                        query[key] = undefined;
                    }
                }
            }
            /* the reset should reset the form and not reload the data */
            if (reset) {
                /** we can pass an array of field names that will be kept when we reset the form */
                if (reset instanceof Array) {
                    const fields: { [index: string]: string } = {};

                    reset.forEach((field: string) => {
                        fields[field] = this.form.value[field];
                    });

                    this.form.reset(fields);
                } else {
                    this.form.reset(this.values);
                }
            } else {
                const store: string = this.locals.filterStore
                    ? this.DSF.r_getStore(this.locals.filterStore)
                    : filterValues.store;

                this.fs.updateFilter({
                    query,
                    store,
                });
            }
        }
    };

    public ngOnDestroy(): void {
        if (this.formSubscription) {
            this.formSubscription.unsubscribe();
        }

        if (this.FSStore) {
            this.FSStore.unsubscribe();
        }

        if (this.AStore) {
            this.AStore.unsubscribe();
        }

        if (this.RStore) {
            this.RStore.unsubscribe();
        }

        if (this.FStore) {
            this.FStore.unsubscribe();
        }

        if (this.VStore) {
            this.VStore.unsubscribe();
        }
        if (this.TStore) {
            this.TStore.unsubscribe();
        }

        this.values = {};

        // this.removeBodyClass('editmode');

        console.info(`$df.form.component (ngOnDestroy) => destroying ${this.locals?.formName || ''}`);
    }

    private patchValues = (values: any): void => {
        if (isEmpty(values)) {
            return;
        }

        if (isEqual(this.form.value, values)) {
            return;
        }

        const o: any = {};
        for (const v in values) {
            // values is an object arry
            if (Object.prototype.hasOwnProperty.call(this.form.controls, v)) {
                const q: any = this.qcs.getGroupQuestion(v, this.questionGroups);

                // we update the value of the question
                if (q && q.value !== values[v]) {
                    q.value = values[v];
                }
                if (this.form.controls[v].value !== values[v]) {
                    o[v] = values[v];
                }
            }
        }
        if (!isEmpty(o)) {
            this.form.patchValue(o, { emitEvent: true });
            this.checkRequires();
            // this.check('patchValues');
        }
    };

    private findIdx = (arr: any[], field: string, value: string): any =>
        findIndex(arr, (el: any) => el[field] === value);

    private setPath: any = (path: string, value: string, notation: string, values: any): any => {
        const isObject: any = (obj: any): any => Object.prototype.toString.call(obj) === '[object Object]' && !!obj;

        notation = notation || '.';

        return path.split(notation).reduce((prev, cur, idx, arr) => {
            const isLast: boolean = idx === arr.length - 1;
            if (isLast) {
                return (prev[cur] = value);
            }
            // if <cur> is not last part of path, then returns object if existing value is object or empty object

            return isObject(prev[cur]) ? prev[cur] : (prev[cur] = {});
        }, values);
    };

    /** a function that add to the original values the values from the form
     * this.form values has the highest level;
     */
    private emitValues(): any {
        let val: any = this.form.value;
        if (this.values) {
            val = this.DSF.OA(this.values, val);
        }
        if (this.locals.values) {
            val = this.DSF.OA(this.locals.values, val);
        }

        return val;
    }

    private diff: any = (obj1: any, obj2: any): any => {
        if (obj2 === undefined) {
            return obj1;
        }
        const r: any = {};

        for (const prop in obj1) {
            if (Object.prototype.hasOwnProperty.call(obj1, prop) && obj1[prop] !== obj2[prop]) {
                r[prop] = obj1[prop];
            }
        }

        return r;
    };

    private setBodyClass = (cl: string): void => {
        console.info(`%c$df.form.component (setBodyClass) => ${cl}`, 'color:blue');
        // this is to prevent error on ExpressionChangedAfterItHasBeenCheckedError
        if (cl) {
            setTimeout(
                () => {
                    this.env.nextClass(cl);
                },
                1,
                cl
            );
        }

        // this.check('setBodyClass');
    };

    private removeBodyClass = (cl: string): void => {
        console.info(`%c$df.form.component (removeBodyClass) => ${cl}`, 'color:blue');
        // this is to prevent error on ExpressionChangedAfterItHasBeenCheckedError
        if (cl) {
            setTimeout(
                () => {
                    this.env.nextClass(cl, true);
                },
                1,
                cl
            );
        }

        // this.check('removeBodyClass');
    };

    private check = (from: string) => {
        this.TimeCheck = new Date().getTime();
        console.info(`%c$df.form.component (check): called by => ${from} at ${this.TimeCheck}`, 'color:red');
        this.cd.markForCheck();
    };
}
