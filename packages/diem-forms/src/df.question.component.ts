/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/member-ordering */
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    HostBinding,
    HostListener,
    Input,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DFQuestionControlService, IWatchField } from './df.question.control.service';
import { DFFormService } from './df.form.service';
import { DFCommonService } from './df.common.api';
import { IAction, IItem, IFormSpecs, IQuestion } from './definitions/interfaces';
import { QuestionGroup } from './definitions/question-group';
import { tmpl } from './templates/df.question.pug.tmpl';

interface IHTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
    dataTransfer?: DataTransfer;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-question',
    template: tmpl,
})
export class DFQuestionComponent implements OnDestroy, OnInit {
    public subscriptions: Subscription[] = [];
    public questionTmpl?: TemplateRef<any>;

    @ViewChild('codeeditor', { static: true }) public codeeditor!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editautocomplete', { static: true }) public editautocomplete!: TemplateRef<any>;
    @ViewChild('editbutton', { static: true }) public editbutton!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editcalendar', { static: true }) public editcalendar!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editcheckbox', { static: true }) public editcheckbox!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editchips', { static: true }) public editchips!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editdropdown', { static: true }) public editdropdown!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editeditor', { static: true }) public editeditor!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readeditor', { static: true }) public readeditor!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editicon', { static: true }) public editicon!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editnumber', { static: true }) public editnumber!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('radio', { static: true }) public radio!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('toggle', { static: true }) public toggle!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('edittextarea', { static: true }) public edittextarea!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('edittextbox', { static: true }) public edittextbox!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('editupload', { static: true }) public editupload!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('fileViewer', { static: true }) public fileViewer!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('forminvalid', { static: true }) public forminvalid!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readautocomplete', { static: true }) public readautocomplete!: TemplateRef<any>;
    @ViewChild('readcalendar', { static: true }) public readcalendar!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readcheckbox', { static: true }) public readcheckbox!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readchips', { static: true }) public readchips!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readnumber', { static: true }) public readnumber!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readrepeater', { static: true }) public readrepeater!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readtextbox', { static: true }) public readdropdown!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readtextbox', { static: true }) public readtextarea!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('readtextbox', { static: true }) public readtextbox!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('table', { static: true }) public table!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('text', { static: true }) public text!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('tooltip', { static: true }) public tooltip!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('overflow', { static: true }) public overflow!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('mermaid', { static: true }) public mermaid!: TemplateRef<any>; /** ! Will come later */

    @Input() public question!: IQuestion; /** ! Will be added later */
    @Input() public form!: FormGroup; /** ! Will be added later */
    @Input() public TimeCheck?: any;
    @Input() public questionGroup!: QuestionGroup<any>; /** ! Will be added later */
    @Input() public formSpecs!: IFormSpecs; /** ! Will be added later */

    private hiddenQuestion: boolean = false;
    @HostBinding('class.hidden') get hidden(): any {
        return this.hiddenQuestion;
    }

    public fieldsToWatch: IWatchField[] = [];
    public permVisible = false;
    public permEditable = false;
    public dragTarget?: EventTarget | null;
    public tieredModel: any = [];
    public env: Env;

    private DFCS: DFCommonService;
    private cd: ChangeDetectorRef;
    private formService: DFFormService;
    private httpService: HttpService;
    private qcs: DFQuestionControlService;
    private formSubscription!: Subscription; /** ! Added Later */
    private store: Store<any>;
    private uploadedFilesLength: number = 0;
    private sanitizer: DomSanitizer;

    public constructor(
        env: Env,
        DFCS: DFCommonService,
        cd: ChangeDetectorRef,
        formService: DFFormService,
        httpService: HttpService,
        qcs: DFQuestionControlService,
        store: Store<any>,
        sanitizer: DomSanitizer
    ) {
        this.env = env;
        this.DFCS = DFCS;
        this.cd = cd;
        this.formService = formService;
        this.httpService = httpService;
        this.qcs = qcs;
        this.store = store;
        this.sanitizer = sanitizer;
    }

    get isValid(): boolean {
        if (this.question.key) {
            return this.form.controls[this.question.key].valid;
        }

        return false;
    }

    get isInvalid(): boolean {
        if (this.question.key) {
            return this.form.controls[this.question.key].invalid;
        }

        return false;
    }

    get isVisible(): boolean {
        let x: boolean = true;

        if (this.question.visible) {
            x =
                typeof this.question.visible === 'boolean'
                    ? this.question.visible
                    : this.evalStr(this.question.visible);
        }

        return x;
    }

    @HostListener('document:onChange', ['$event'])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onChangeout(_e: Event): void {
        this.check('HostListener');
    }

    public get oldFiles(): any[] {
        if (this.question && this.question.oldFilesQuestion) {
            const q: AbstractControl | null = this.form.get(this.question.oldFilesQuestion);
            if (q && q.value) {
                return q.value;
            }
        }

        return [];
    }

    public get uploadedFiles(): File[] {
        // public : File[] = [];

        if (this.question && this.question.filesQuestion) {
            const q: AbstractControl | null = this.form.get(this.question.filesQuestion);
            if (q && q.value) {
                return q.value;
            }
        }

        return [];
    }

    public set uploadedFiles(files: File[]) {
        if (this.question && this.question.filesQuestion) {
            const q: AbstractControl | null = this.form.get(this.question.filesQuestion);
            if (q) {
                if (Array.isArray(files)) {
                    q.setValue(files);
                } else {
                    q.value.push(files);
                }

                q.updateValueAndValidity();
            }
        }
    }

    public onFileUploadClick(): void {
        const input: any = document.createElement('input');
        input.setAttribute('type', 'file');

        if (this.question.multiple) {
            input.multiple = true;
        }

        input.onchange = (e?: IHTMLInputEvent) => {
            if (!e) {
                return;
            }

            if (!this.question.multiple) {
                this.uploadedFiles = [];
            }

            const files: FileList | null = e.dataTransfer ? e.dataTransfer.files : e.target ? e.target.files : null;

            if (files) {
                this.addFiles(files);
                this.check('onFileUploadClick');
            }
        };

        input.click();
    }

    public ngOnInit(): void {
        if (this.question.fromEnv) {
            const v: any = this.question.fromEnv;
            const t: { [index: string]: any } = this.env;
            this.question.value = t[v.key][v.value];

            if (this.question.key) {
                const q: AbstractControl | null = this.form.get(this.question.key);
                if (q) {
                    q.setValue(this.question.value);
                }
            }
        }

        if (this.question.dependency) {
            this.fieldsToWatch = this.qcs.getDependents(
                this.question,
                this.fieldsToWatch,
                this.questionGroup.questions
            );
            this.watchDependents();
            this.onValueChanged(this.question.value); // initital check
        }

        if (typeof this.question.hidden === 'string') {
            this.question.hidden = this.evalStr(this.question.hidden);
        }

        if (this.question.hidden) {
            this.hiddenQuestion = true;
        }

        if (
            ['upload', 'editor', 'fileViewer'].includes(this.question.controlType) &&
            this.question.deletedFilesQuestion &&
            this.question.filesQuestion
        ) {
            const z: AbstractControl | null = this.form.get(this.question.filesQuestion);
            if (this.question.oldFilesQuestion) {
                const t: AbstractControl | null = this.form.get(this.question.oldFilesQuestion);

                if (z && t && z.value && z.value.length > 0) {
                    /** there's a need to rename as from server and from upload are not the same names */
                    t.setValue(z.value);
                    this.uploadedFiles = [];
                }
            }
        }

        if (this.question.cache && !this.question.cacheValues) {
            if (
                this.question.value &&
                this.question.items &&
                Array.isArray(this.question.items) &&
                !Array.isArray(this.question.value)
            ) {
                this.question.items.push({
                    content: this.question.value,
                    id: 0,
                    selected: true,
                });
            }
            this.loadItems();
        }

        if (this.question.controlType === 'calendar' && typeof this.question.value === 'string') {
            this.question.value = new Date(this.question.value);
            if (this.question.key) {
                const q: AbstractControl | null = this.form.get(this.question.key);
                if (q) {
                    q.setValue(this.question.value);
                }
            }
        }

        /** do an iniital refresh  */
        this.formSubscribe();

        this.loadView();
    }
    /**
     *
     *
     * @returns
     */
    public loadView = () => {
        /**
         * Important here is that you can disable a formcontrol
         *
         * @info
         * the value can either be a boolean or a string which will be evaluated
         */

        if (this.question.key && this.question.disabled && typeof this.question.disabled === 'string') {
            const q: AbstractControl | null = this.form.get(this.question.key);
            const disabled: boolean = this.evalStr(this.question.disabled);
            if (q && disabled) {
                q.disable({ onlySelf: true, emitEvent: false });
            } else if (q && q.disabled && !disabled) {
                q.enable();
            }
        }

        if (this.question.key && this.question.disabledWhen) {
            const q: AbstractControl | null = this.form.get(this.question.key);
            if (q && this.evalStr(this.question.disabledWhen)) {
                q.disable();
            }
        }

        if (this.question.key && this.question.compute) {
            const q: AbstractControl | null = this.form.get(this.question.key);
            if (q) {
                q.setValue(this.evalStr(this.question.compute));
            }
        }

        if (this.question.key && this.question.computeWhenComposed) {
            const q: AbstractControl | null = this.form.get(this.question.key);
            if (q && !q.value) {
                const value: any = this.evalStr(this.question.computeWhenComposed);
                q.setValue(value);
                this.question.readOnly = true;
            }
        }

        const self: { [index: string]: any } = this;

        /** if there's an element for both read and edit */
        if (self[this.question.controlType]) {
            this.questionTmpl = self[this.question.controlType];
            this.check('loadView-controlType');

            return;
        }

        /** let's assign the default values based on the readmode we are in */
        let ctrl: string = this.formSpecs.readmode ? 'read' : 'edit';

        /**
         * If something needs to be put in readmode then evaluate the condition and overrule the defaults
         * say you have an editelement only for edit but you are in read and want nevertheless to display it
         * if the condition readMode evaludates to true then the button will be displayed in readmode
         * if the condition readMode evaludates to false then the button will not be displayed in readmode
         *
         * say you have an readelement only for read but you are in edit and want nevertheless to display it
         * if the condition editMode evaludates to false then the button will be displayed in editmode
         * if the condition readMode evaludates to true then the button will not be displayed in editmode
         */

        if (this.formSpecs.readmode && this.question.readMode) {
            try {
                ctrl = this.evalStr(this.question.readMode) ? 'edit' : 'read';
            } catch (err) {
                ctrl = 'read';
            }
        }

        if (!this.formSpecs.readmode && this.question.editMode) {
            /** and we are in editmode */

            try {
                ctrl = this.evalStr(this.question.editMode) ? 'edit' : 'read';
            } catch (err) {
                ctrl = 'read';
            }
        }

        const ctrlType: string = `${ctrl}${this.question.controlType}`;
        this.questionTmpl = self[ctrlType];

        this.check('loadView');
    };

    public clickAction = (value: any) => {
        this.DFCS.formChanged({
            action: this.question.action.action,
            params: this.question.action.params,
            values: value,
        });
    };

    public onAction = (actionIn: any, e?: any, options?: {}) => {
        const ev: {} = e && e.value ? e.value : {};

        const action: any = cloneDeep(actionIn); // taking a safe clone of action

        if (!action || !action.type) {
            return;
        }

        // here we add some code to evaluate a form value and add it to the locals, it should contain the word this
        if (action.locals) {
            Object.keys(action.locals).forEach((key: string) => {
                if (
                    action.locals[key] &&
                    typeof action.locals[key] === 'string' &&
                    action.locals[key].includes('this.')
                ) {
                    action.locals[key] = this.evalStr(action.locals[key]);
                }
            });
        }

        this.DFCS.formChanged({
            ...action,
            event: e ? e : undefined,
            values: { ...this.form.value, ...action.values, ...ev, ...options },
        });

        return true;
    };

    public objectValue = (val: undefined | string | { [index: string]: string }, key: string) => {
        if (val && typeof val === 'object') {
            return val[key];
        }

        return val;
    };

    public search(event: string): any[] {
        // cleanup test

        if (this.question.cache && this.question.items.length > 0) {
            return this.question.items.filter((t: IItem) => t.content.includes(event));
        } else {
            this.loadItems(event);
        }

        return [];
    }

    public unique = (myArr: any[], prop: string) =>
        myArr.filter((obj, pos, arr) => arr.map((mapObj: any) => mapObj[prop]).indexOf(obj[prop]) === pos);

    public html = (value: any): SafeHtml => {
        if (!value) {
            return '';
        }

        return this.sanitizer.bypassSecurityTrustHtml(value);
    };

    public getOptionLabel = (question: IQuestion, value?: string | number): string | number | undefined => {
        if (!value) {
            return value;
        }

        if (!question.items) {
            if (value && question.type === 'number') {
                return value.toLocaleString();
            }

            return value;
        }

        const obj: { content: string; id: any } = question.items.filter(
            (option: { content: string; id: any }) => option.id && option.id === value
        )[0]; /** only the first one */

        if (obj && obj.content) {
            return obj.content;
        }

        return value;
    };

    public onReset = () => {
        if (this.question.key) {
            const q: AbstractControl | null = this.form.get(this.question.key);
            if (q) {
                q.setValue(undefined);
            }
        }
        this.question.value = undefined;
    };

    public removeFile(file: any): void {
        const idx: number = this.uploadedFiles.findIndex((x: any) => x.name === file.name && x.size === file.size);
        if (idx > -1) {
            const v: any[] = this.uploadedFiles;
            v.splice(idx, 1);
            this.uploadedFiles = v;
            this.uploadedFilesLength -= file.size / 1024 / 1024;
        }
    }

    public removeOldFile(file: any): void {
        let newvalue: any[] = [];

        if (this.question.oldFilesQuestion) {
            const q: AbstractControl | null = this.form.get(this.question.oldFilesQuestion);
            if (q && q.value) {
                const idx: number = q.value.findIndex((x: any) => x.name === file.name && x.size === file.size);
                if (idx > -1) {
                    newvalue = q.value;
                    newvalue.splice(idx, 1);
                    q.setValue(newvalue);
                }
            }
        }

        /** let's put the file in the targetquestion */
        if (this.question.deletedFilesQuestion) {
            const q: AbstractControl | null = this.form.get(this.question.deletedFilesQuestion);
            if (q && q.value) {
                q.value.push(file);
                q.updateValueAndValidity();
            }
        }
    }

    public dragenter = (e?: Event): boolean => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
            this.dragTarget = e.target;
        }

        return false;
    };

    public dragover = (e?: Event): boolean => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        return false;
    };

    public dragleave = (e: Event): void => {
        if (e && e.target === this.dragTarget) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    public drop = (e?: IHTMLInputEvent): void => {
        if (!e) {
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        if (!this.question.multiple) {
            this.uploadedFilesLength = 0;
            this.uploadedFiles = [];
        }

        const files: FileList | null = e.dataTransfer ? e.dataTransfer.files : e.target.files;

        if (files) {
            this.addFiles(files);
            this.cd.detectChanges();
            this.check('drop');
        }
    };

    public ngOnDestroy(): void {
        if (this.subscriptions) {
            this.subscriptions.forEach((subscription: Subscription) => {
                subscription.unsubscribe();
            });
        }
        if (this.formSubscription) {
            this.formSubscription.unsubscribe();
        }
    }

    public formSubscribe = () => {
        this.formSubscription = this.DFCS.form$.subscribe((action: IAction) => {
            if (action.target && action.target === this.formSpecs.id) {
                if (action.type === 'edit') {
                    this.formSpecs.readmode = false;
                    this.loadView();
                } else if (['read', 'cancel'].includes(action.type)) {
                    this.formSpecs.readmode = true;
                    this.loadView();
                }

                // this.check('formSubscribe');
            }
        });
    };

    public arrayHasNot: (array: any[], field: string[]) => boolean = (array: any[], field: string[]): boolean =>
        array.some((row: { [index: string]: any }) => {
            const l: any[] = Object.keys(row).filter(
                (elem: string) => field.indexOf(elem) > -1 && row[elem] !== undefined
            );

            return l.length === 0 ? true : false;
        });

    public evalStr: any = (str: string): any => {
        // if (!str) {
        //   return str;
        // }
        try {
            return Function(`"use strict";return (${this.parseCondition(str)})`).call(this);
        } catch (err) {
            return false;
        }
    };

    // autocomplete

    public onSelect = (e: { item: any | any }) => {
        const value: any = e.item && e.item.content ? e.item.content : e;

        if (this.question.action) {
            this.DFCS.formChanged({
                action: this.question.action.type,
                params: this.question.action.params,
                values: this.question.key ? { [this.question.key]: value } : {},
            });
        }

        this.form.patchValue(value);

        this.check('onSelect');
    };

    public getTags = (field: string): string[] => {
        const q: any = this.form.get(field);

        if (q && q.value) {
            return q.value;
        }

        return [];
    };

    // autocomplete
    private loadItems = (event?: any) => {
        /** no use in loading data if there's no url */

        if (this.question.cacheValues) {
            this.question.items = this.question.cacheValues;
        }

        if (!this.question.url) {
            return;
        }
        const url: string = this.question.url + (event ? encodeURIComponent(event.query) : '');
        this.subscriptions.push(
            this.httpService
                .httpGet(url)
                .pipe(debounceTime(400), distinctUntilChanged())
                .subscribe((options: any) => {
                    if (!options) {
                        return;
                    }
                    let result: IItem[] = options;

                    if (Array.isArray(result) && result.length > 0 && !result[0].content) {
                        // if the item matches the current value, then it's selected
                        result = options.map((x: string, i: number) => ({
                            content: x,
                            id: i,
                            selected: this.question.value === x,
                        }));
                    }

                    this.question.items = result;
                    this.question.cacheValues = result;
                    this.check('loadItems');
                })
        );
    };

    private addFiles = (files: any) => {
        for (const file of files) {
            if (file.size === 0) {
                this.store.dispatch({
                    detail:
                        // eslint-disable-next-line max-len
                        `${file.name} has zero bytes and cannot be uploaded. Please check your file or if the application you are uploading from supports this kind of upload.`,
                    key: 'bl',
                    life: 10000,
                    type: 'WARN',
                });
            }

            if (
                this.question.maxFileSize &&
                this.uploadedFilesLength + file.size / 1024 / 1024 > this.question.maxFileSize
            ) {
                this.store.dispatch({
                    detail: `You have reached the limit of ${this.question.maxFileSize} MB allowed`,
                    key: 'bl',
                    life: 10000,
                    type: 'WARN',
                });
            }

            if (
                file.size > 0 &&
                (!this.question.maxFileSize ||
                    this.uploadedFilesLength + file.size / 1024 / 1024 < this.question.maxFileSize) &&
                this.question.filesQuestion
            ) {
                this.uploadedFilesLength += file.size / 1024 / 1024;

                const filesArray: any[] = [...this.uploadedFiles, ...this.oldFiles];
                const idx: number = filesArray.findIndex((x: any) => x.name === file.name && x.size === file.size);
                if (idx === -1) {
                    this.uploadedFiles = file;
                }
            }
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onValueChanged = (_data: any): void => {
        let value: string;
        let status: boolean;
        let status2: boolean;
        let disabled: boolean;
        let required: boolean;
        let x2: Date;
        let x3: Date;
        let q2: AbstractControl | null;

        this.fieldsToWatch.forEach((dep) => {
            switch (dep.type) {
                case 'update-when':
                    value = this.evalStr(dep.condition);
                    if (value && this.question.key) {
                        const q0: AbstractControl | null = this.form.get(this.question.key);
                        if (q0) {
                            q0.setValue(undefined);
                            this.check('onValueChanged');
                        }
                    }
                    break;

                case 'choice-list':
                    if (this.question.dependency) {
                        const watchFldValue: any[] = this.question.dependency.map((obj: any) => {
                            const q0: AbstractControl | null = this.form.get(obj.watch[0]);
                            if (q0) {
                                if (q0.value === '' || q0.value === null) {
                                    return undefined;
                                } else {
                                    return q0.value;
                                }
                            }
                        });

                        if (this.question.url) {
                            this.loadItems({
                                query: watchFldValue[0],
                            });
                        } else {
                            this.question.items = this.formService.filterOptions(
                                this.question.optionsInfo,
                                watchFldValue[0],
                                this.question.placeHolder
                            );

                            const idx: number = this.question.items.findIndex(
                                (x: { content: string }) => x.content === this.question.value
                            );

                            if (idx === -1 && this.question.key) {
                                const q6: AbstractControl | null = this.form.get(this.question.key);
                                if (q6) {
                                    q6.setValue([]);
                                }
                            }
                        }
                    }

                    break;

                case 'hide-when':
                    status = this.evalStr(dep.condition);

                    if (this.question.key) {
                        const q1: AbstractControl | null = this.form.get(this.question.key);

                        if (q1) {
                            // we have a question

                            if (status) {
                                // condition is true, hide it
                                this.question.hidden = true; /* set it to hidden */
                                this.hiddenQuestion = true;
                                if (!dep.keepValue) {
                                    // there's no flag to keep the value
                                    this.question.value = undefined;
                                    q1.setValue(undefined);
                                }
                                if (dep.disable) {
                                    // there's a flag to disable the question
                                    q1.disable();
                                }
                            } else {
                                // the question is to be visivle

                                if (!this.question.hidden) {
                                    /* already hidden */
                                    if (this.hiddenQuestion !== true) {
                                        this.hiddenQuestion = false;
                                    }

                                    return;
                                }
                                this.question.hidden = false;
                                this.hiddenQuestion = false;
                                if (dep.disable) {
                                    // there's a flag to disable the question if condition is true, so enable it
                                    q1.enable();
                                }
                            }
                        } else {
                            /* it's not a question but design element buttton icon etc... */
                            this.question.hidden = status;
                            this.hiddenQuestion = status ? true : false;
                        }
                    } else {
                        this.question.hidden = status;
                        this.hiddenQuestion = status ? true : false;
                    }
                    break;

                case 'show-when':
                    status2 = this.evalStr(dep.condition);
                    this.question.hidden = !status2;
                    this.hiddenQuestion = status2 ? true : false;
                    break;

                case 'disabled-when':
                    disabled = this.evalStr(dep.condition);

                    if (this.question.key) {
                        const q: AbstractControl | null = this.form.get(this.question.key);

                        if (q) {
                            if (disabled) {
                                q.disable();
                            } else {
                                q.enable();
                            }
                        }
                    } else {
                        this.question.disabled = disabled;
                    }

                    break;

                case 'required-when':
                    required = this.evalStr(dep.condition);

                    if (this.question.key) {
                        const q: AbstractControl | null = this.form.get(this.question.key);

                        if (q) {
                            if (required) {
                                q.setValidators(this.qcs.getValidators(this.question));
                                if (q.value === undefined) {
                                    q.setErrors({ required: true });
                                }
                                this.question.required = true;
                            } else {
                                q.clearValidators();
                                q.setErrors(null);
                                this.question.required = false;
                            }

                            this.check('required-when');
                        }
                    }

                    break;

                case 'min-date':
                    x2 = this.evalStr(dep.condition);
                    if (x2 && !this.question.minDate) {
                        this.question.minDate = x2;
                    }
                    break;

                case 'max-date':
                    x3 = this.evalStr(dep.condition);
                    if (x3 && !this.question.maxDate) {
                        this.question.maxDate = x3;
                    }
                    break;

                case 'compute':
                    if (!this.question.key) {
                        return;
                    }

                    q2 = this.form.get(this.question.key);

                    if (q2) {
                        q2.setValue(this.evalStr(dep.condition));
                    }

                    break;

                default:
                    break;
            }
        });
    };

    private watchDependents(): void {
        this.fieldsToWatch.forEach((field) => {
            this.subscriptions.push(
                this.form.controls[field.watch].valueChanges
                    .pipe(debounceTime(200) /** changed to 200 */)
                    .subscribe((data: any) => this.onValueChanged(data))
            );
        });
    }

    private parseCondition = (condition: string): string => {
        if (typeof condition === 'boolean') {
            return condition;
        }

        return condition.split('$$').join('this.form.value.');
    };

    private check = (from: string) => {
        console.info(
            `%c$df.question.component (check): called by => ${from} for: ${this.question.key || 'na'}`,
            'color:red'
        );
        this.cd.markForCheck();
    };
}
