import { ActivatedRoute, Router } from '@angular/router';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import {
    DFCommonService,
    DFStoreFunctions,
    IConfig,
    IData,
    IModalOptions,
    IOptions,
    IStoreFormState,
    IStoreTableState,
} from '@mydiem/diem-forms';
import { isEqual } from 'lodash-es';
import { Env } from '@mydiem/diem-angular-util';
import { Subscription } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { IntClientAnnotations, IntSharedAction } from '@interfaces';
import { Store } from '@ngrx/store';
import { fadeInAnimation } from '../main.animation';
import { MainCommonFunctions } from '../main.common.functions';
import { DialogService } from '../main.api';
import { SocketService } from '../socket.api';
import { tmpl } from './templates/jobdetail.pug.tmpl';

const getRequiredFields = (values: { [index: string]: any }, required: []) => {
    const obj: { [index: string]: any } = {};
    required.forEach((f: any) => {
        obj[f.in] = values[f.out];
    });

    return obj;
};

interface IConfig2 extends IConfig {
    menu: any;
    help: any;
}

@Component({
    animations: [fadeInAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class JobDetailComponent implements OnInit, OnDestroy {
    @ViewChild('modalViewChild', { static: false })
    public modalViewChild!: TemplateRef<any>; /** ! Will com later */

    @ViewChild('header', { static: false })
    public header!: TemplateRef<any>; /** ! Will com later */

    public records: { [index: string]: any } = {}; /** the values of the form, filled in if this is an active item */
    public orgrecords: { [index: string]: any } = {}; /** a copy for the original records */
    public config: IConfig2 | undefined; /** ! Will com later */
    public modalConfig: any = {};
    public headerTmpl?: TemplateRef<any>;

    public MCF: MainCommonFunctions;
    public env: Env;
    public error = false;
    public loaded: boolean;

    public draggingEnabled = false;
    public panningEnabled = true;
    public zoomEnabled = false;
    public autoZoom = false;
    public autoCenter = false;

    public animate = true;

    private DFCS: DFCommonService;
    private DS: DialogService;
    private DSF: DFStoreFunctions;
    private cd: ChangeDetectorRef;
    private dataSub!: Subscription; /** ! Will com later */
    private formSub!: Subscription; /** ! Will com later */
    private id?: string;
    private route: ActivatedRoute;
    private routeData!: Subscription; /** ! Will com later */
    private router: Router;
    private storeName = '';
    private store: Store<any>;
    private data: any = {};
    private ws: SocketService;

    public constructor(
        env: Env,
        MCF: MainCommonFunctions,
        route: ActivatedRoute,
        cd: ChangeDetectorRef,
        DS: DialogService,
        DFCS: DFCommonService,
        DSF: DFStoreFunctions,
        router: Router,
        store: Store<any>,
        ws: SocketService
    ) {
        this.env = env;
        this.MCF = MCF;
        this.route = route;
        this.cd = cd;
        this.DS = DS;
        this.DFCS = DFCS;
        this.DSF = DSF;
        this.router = router;
        this.loaded = false;
        this.store = store;
        this.ws = ws;
    }

    public ngOnInit(): void {
        this.records = {};

        this.dataSub = this.MCF.dataSubj
            .pipe(
                catchError(async (error: unknown) => {
                    if (typeof error === 'object') {
                        const err = error as Error;

                        console.info(`$jobdetail.component (onit): error : ${err.message}`);
                    }
                }),
                filter((d: IData) => d !== undefined)
            )
            .subscribe((v: IData) => {
                if (v?.values) {
                    this.records = v.values;
                    if (Object.keys(this.orgrecords).length === 0) {
                        this.orgrecords = { ...v.values };
                    }
                }
                this.env.record = this.records;
                this.store.dispatch({
                    key: 'bl',
                    type: 'HIDE',
                });
            });

        this.formSub = this.DFCS.form$.subscribe((options: IOptions) => this.handleActions(options));

        /** subscribe to the data provided by the route resolver */
        this.routeData = this.route.data.subscribe({
            next: (data: any) => {
                // first check if there's already a config
                if (this.config) {
                    this.config = undefined;
                    this.check('New Config');
                }

                this.data = data;
                this.loaded = false;
                // optimization this.check('ngOnInit-routeData');
                this.id = this.data.params.id || this.data.component;
                if (this.data.component) {
                    console.info(`$jobdetail.component (ngOnInit): using : ${this.data.component} with id ${this.id}`);
                    this.MCF.loadConfig(this.data.component)
                        .then((res: any) => this.parseConfig(res))
                        .catch(() => {
                            this.loaded = false;
                            this.error = true;
                        });
                }
            },
        });
    }

    public ngOnDestroy(): void {
        if (this.formSub) {
            this.formSub.unsubscribe();
        }
        if (this.dataSub) {
            this.dataSub.unsubscribe();
        }
        /** also unsubscribe the common functions as this will not destroy itself */
        if (this.MCF.FSStore) {
            this.MCF.FSStore.unsubscribe();
        }

        if (this.routeData) {
            this.routeData.unsubscribe();
        }

        console.info('$jobdetail.component (ngOnDestroy): removing class: editmode');
        if (this.env) {
            this.env.nextClass('editmode', true);
        }

        console.info(`$jobdetail.component (ngOnDestroy): destroying : ${this.id}`);
    }

    public evalStr: any = (str: string): any => Function(`"use strict";return (${str})`).call(this);

    public socketMsg: any = (msg: any): void => {
        this.ws.msg(msg);
    };

    public handleActions = (action: IOptions): void => {
        const caseMap: { [index: string]: any } = {
            download: this.ActionDownload,
            error: this.OError,
            fromstore: this.ActionFromStore,
            modalform: this.ActionModalForm,
            reset: this.ActionReset,
            route: this.ActionRoute,
            select: this.ActionSelect,
            tostore: this.ActionToStore,
            update: this.ActionUpdate,
            values: this.ActionValues,
            edit: this.ActionEdit,
        };

        if (caseMap[action.type]) {
            caseMap[action.type](action);
            // this.check(`handleActions: ${action.type}`);
        }
    };

    private parseConfig = (config: IConfig2): void => {
        this.config = config;

        if (this.data.config) {
            this.config = this.merge(this.config, this.data.config);
        }

        if (!this.config) {
            return;
        }

        this.loaded = true;
        this.storeName = this.DSF.r_getStore(this.config.store);

        if (this.config.values && this.config.reset) {
            this.DSF.resetFormStore(this.storeName, {
                form: {
                    name: this.config.store,
                    valid: true,
                },
                loaded: this.loaded,
                values: this.config.values,
            });
        }

        if (this.MCF.transferdata && !(this.config.baseUrl && this.config.baseUrl.noTransfer)) {
            this.DSF.updateForm(this.getForm(this.MCF.transferdata));
            this.MCF.transferdata = undefined;
        } else {
            this.MCF.transferdata = undefined;
        }

        /** get now the data from the store via common functions */
        this.MCF.getData(this.storeName);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self: { [index: string]: any } = this;
        if (self[this.config.headerTmpl]) {
            this.headerTmpl = self[this.config.headerTmpl];
        }

        this.check('parseConfig');
        window.scrollTo(0, 0);
    };

    private getForm = (values: any): IStoreFormState => ({
        error: false,
        form: {
            name: this.config ? this.config.store : undefined,
            valid: false,
        },
        loaded: false,
        store: this.storeName /** none existing store , but others will listen in */,
        target: this.storeName,
        values,
    });

    private checkModal = (proceed: boolean, options: any) => {
        /** prevent the modal to be closed */
        if (!proceed || (options.params && options.params.keepModal)) {
            console.info('$jobdetail.component (closeModal): jobdetailed to no close modal)');

            return;
        }

        this.DS.closeModal();
        this.check('checkModal');
    };

    private ActionValues = () => {
        this.DS.closeModal();
        this.check('ActionValues');
    };

    private ActionReset = () => {
        this.DSF.updateForm(this.getForm(this.config ? this.config.resetvalues : {}));
    };

    private ActionSelect = (action: any) => {
        this.DS.closeModal();
        this.DSF.updateForm(this.getForm(action.values));
    };

    /**
     * Opens a window
     *
     * @private
     * @memberof jobdetailComponent
     */
    private ActionModalForm = async (action: any) => {
        if (!action) {
            return;
        }

        let values: { [key: string]: any } = { ...action.values } || {};

        if (action.locals && action.locals.map) {
            action.locals.map.fields.forEach((f: any) => {
                values[f.in] = { ...action.values[f.out] };
            });
        }

        if (action.locals && action.locals.fromStore && !action.locals.fromServer) {
            const store: string = this.DSF.r_getStore(action.locals.store);
            if (action.locals.reset) {
                this.DSF.resetFormStore(store, {
                    form: {
                        name: action.locals.formName,
                        valid: true,
                    },
                    loaded: this.loaded,
                    values: action.values,
                });
            }

            await this.MCF.getFromStore(store)
                .then((storeRecords: any) => {
                    if (storeRecords && storeRecords.values) {
                        values = { ...values, ...storeRecords.values };
                    }
                })
                .catch((err: Error) => console.error('$jobdetail.component (ActionModalForm): error', err));
        }

        const mopt: IModalOptions = {
            context: {
                locals: action.locals,
                values: !isNaN(action.index) ? { ...values, index: action.index } : values,
            },
            options: action.modalOptions,
            template: this.modalViewChild,
        };

        /* this is a little hack just for this module to add a jobid to the values*/

        this.DS.showModal(mopt);
    };

    private ActionEdit = async () => {
        this.MCF.getFromStore(this.storeName)
            .then((storeRecords: any) => {
                this.orgrecords = { ...storeRecords.values };
            })
            .catch((err: Error) => console.error('$jobdetail.component (Ostore): error', err));
    };

    private ActionUpdate = async (action: IOptions) => {
        const annotations: IntClientAnnotations = {};
        let values: { [key: string]: any } = { ...action.values } || {};

        if (action.params) {
            if (action.params.return) {
                annotations.return = action.params.return;
            }

            if (action.params.processing) {
                this.DS.showModal({
                    message: 'Processing, please wait ...',
                    spinner: true,
                });
            }
        }

        values.annotations = { ...annotations, ...action.params };

        if (action.locals && action.locals.fromStore) {
            const store: string = this.DSF.r_getStore(action.locals.store);

            await this.MCF.getFromStore(store)
                .then((storeRecords: any) => {
                    if (storeRecords?.values) {
                        values = { ...values, ...storeRecords.values };
                    }
                })
                .catch((err: Error) => console.error('$jobdetail.component (ActionUpdate): error', err));
        }

        const compare = this.compare(values);

        this.MCF.postData(compare, action.params)
            .then(async (proceed: any) => {
                this.checkModal(proceed, action);
            })
            .catch((err: Error) => console.error('$jobdetail.component (OStore-post): error', err));
    };

    private ActionFromStore = async (action: IOptions) => {
        const store: string = this.DSF.r_getStore(action.params.store);

        const annotations: IntClientAnnotations = {};

        if (action.params) {
            if (action.params.return) {
                annotations.return = action.params.return;
            }

            if (action.params.processing) {
                this.DS.showModal({
                    message: 'Processing, please wait ...',
                    spinner: true,
                });
            }
        }

        this.MCF.getFromStore(store)
            .then((storeRecords: any) => {
                const records: any = { ...storeRecords.values };
                records.annotations = { ...annotations, ...action.params };
                this.MCF.postData(records, action.params)
                    .then((proceed: any) => this.checkModal(proceed, action))
                    .catch((err: Error) => console.error('$jobdetail.component (OStore-post): error', err));
            })
            .catch((err: Error) => console.error('$jobdetail.component (Ostore): error', err));
    };

    private ActionToStore = (action: IOptions) => {
        if (!action) {
            return;
        }
        if (!action.noclose) {
            this.DS.closeModal();
        }

        let values: { [key: string]: any } = { ...action.values } || {};

        if (action.locals && action.locals.required) {
            values = {};
            action.locals.required.forEach((f: any) => {
                values[f.in] = action.values[f.out];
            });
        }

        const store: string = this.DSF.r_getStore(action.locals.store);

        const payload: IStoreTableState = {
            error: false,
            index: action.index,
            key: action.key || this.MCF.guid(),
            loaded: true,

            options: action.locals.options ? action.locals.options : undefined,
            store,
            unshift: action.unshift,
            values,
        };

        this.MCF.dispatch({
            payload,
            type: action.locals.type,
        });
    };

    private ActionDownload = async (options: any) => {
        if (!options) {
            return;
        }

        if (options.required) {
            options.values = getRequiredFields(options.values, options.required);
        }

        if (options.locals && options.locals.fromStore) {
            const store: string = this.DSF.r_getStore(options.locals.store);

            await this.MCF.getFromStore(store)
                .then((storeRecords: any) => {
                    options.values = { ...options.values, ...storeRecords.values };
                })
                .catch((err: Error) => console.error('$jobdetail.component (ActionModalForm): error', err));
        }

        if (options.id && options.values) {
            options.values.id = this.id;
        }

        this.MCF.download(options.values, options.params);
    };

    private OError = (action: any) => {
        this.DS.showModal({
            error: true,
            message: action.message,
        });
    };

    private ActionRoute = (action: IntSharedAction) => {
        if (this.DS.isOpen) {
            this.DS.closeModal();
        }

        if (action.params && action.params.route) {
            this.router
                .navigate([action.params.route])
                .catch((err: Error) => console.error('$jobdetail.component (ActionRoute): error', err));
        }
    };

    private merge = (current: any, update: any) => {
        Object.keys(update).forEach((key) => {
            // if update[key] exist, and it's not a string or array,
            // we go in one level deeper
            if (
                Object.prototype.hasOwnProperty.call(current, key) &&
                typeof current[key] === 'object' &&
                !(current[key] instanceof Array)
            ) {
                this.merge(current[key], update[key]);

                // if update[key] doesn't exist in current, or it's a string
                // or array, then assign/overwrite current[key] to update[key]
            } else {
                current[key] = update[key];
            }
        });

        return current;
    };

    private compare = (values: { [key: string]: any }) => {
        const diff: { [key: string]: any } = {};

        for (const [key, value] of Object.entries(values)) {
            if (['id', 'jobid'].includes(key) || !isEqual(this.orgrecords[key], value)) {
                diff[key] = value;
            }
        }

        return diff;
    };

    private check = (from: string) => {
        console.info(`%c$jobdetail.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
