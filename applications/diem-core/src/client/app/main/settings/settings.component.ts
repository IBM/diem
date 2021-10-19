import { ActivatedRoute, Router } from '@angular/router';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    HostBinding,
} from '@angular/core';
import {
    DFCommonService,
    DFStoreFunctions,
    IConfig,
    IModalOptions,
    IOptions,
    IStoreFormState,
    IStoreTableState,
} from '@mydiem/diem-forms';
import { Env } from '@mydiem/diem-angular-util';
import { Subscription } from 'rxjs';
import { IntClientAnnotations, IntSharedAction } from '@interfaces';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SocketService } from '../socket.api';
import { fadeInAnimation } from '../main.animation';
import { MainCommonFunctions } from '../main.common.functions';
import { DialogService } from '../main.api';
import { tmpl } from './templates/settings.pug.tmpl';

const getRequiredFields = (values: { [index: string]: any }, required: []) => {
    const obj: { [index: string]: any } = {};
    required.forEach((f: any) => {
        obj[f.in] = values[f.out];
    });

    return obj;
};

interface IModule {
    component: string;
    title: string;
    template: string;
    access?: string[];
}

interface IRouteData {
    params: {
        component: string;
        id: string;
    };
    paths: string[];
    title: string;
    titleicon: string;
    config: any;
    modules?: IModule[];
}

@Component({
    animations: [fadeInAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class SettingsComponent implements OnInit, OnDestroy {
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @HostBinding('class') navClass: string = '';

    @ViewChild('modalViewChild', { static: false })
    public modalViewChild!: TemplateRef<any>; /** ! Will com later */

    @ViewChild('contentTemplate', { static: false })
    public contentTemplate!: TemplateRef<any>; /** ! Will com later */

    @ViewChild('noAccessTemplate', { static: false })
    public noAccessTemplate!: TemplateRef<any>; /** ! Will com later */

    public contentTmpl?: TemplateRef<any>;

    public records: { [index: string]: any } = {}; /** the values of the form, filled in if this is an active item */
    public config!: IConfig; /** ! Will com later */
    public modalConfig: any = {};
    public message: string = '';
    public sidebar: boolean = true;
    public param: string = 'main';

    public MCF: MainCommonFunctions;
    public env: Env;
    public error: boolean = false;
    public errormsg: string = '';
    public loaded: boolean = false;
    public fatal: boolean = false;

    public draggingEnabled: boolean = false;
    public panningEnabled: boolean = false;
    public zoomEnabled: boolean = false;
    public autoZoom: boolean = false;
    public autoCenter: boolean = true;
    public component?: string;
    public data?: IRouteData;

    private DFCS: DFCommonService;
    private DS: DialogService;
    private DSF: DFStoreFunctions;
    private cd: ChangeDetectorRef;
    private dataSub!: Subscription; /** ! Will com later */
    private formSub!: Subscription; /** ! Will com later */
    private id?: string;
    private module?: IModule;
    private route: ActivatedRoute;
    private routeData!: Subscription; /** ! Will com later */
    private router: Router;
    private storeName: string = '';
    private ws: SocketService;
    private sanitizer: DomSanitizer;

    public constructor(
        env: Env,
        MCF: MainCommonFunctions,
        route: ActivatedRoute,
        cd: ChangeDetectorRef,
        DS: DialogService,
        DFCS: DFCommonService,
        DSF: DFStoreFunctions,
        router: Router,
        ws: SocketService,
        sanitizer: DomSanitizer
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
        this.ws = ws;
        this.sanitizer = sanitizer;
    }

    public html = (value: any): SafeHtml => {
        if (!value) {
            return '';
        }

        return this.sanitizer.bypassSecurityTrustHtml(value);
    };

    public ngOnInit(): void {
        this.records = {};

        this.formSub = this.DFCS.form$.subscribe((options: IOptions) => this.handleActions(options));

        /** subscribe to the data provided by the route resolver */
        this.routeData = this.route.data.subscribe(async (data: any) => {
            this.fatal = false;
            this.data = data;
            if (!this.data) {
                return;
            }
            if (this.contentTmpl) {
                this.contentTmpl = undefined;
                this.check('template');
            }
            // this.check('ngOnInit');
            this.id = this.data.params.id;
            this.component = this.data.params.component;
            if (this.data && this.data.modules && this.data.params && this.data.params.component) {
                this.module = this.data.modules.find((component: any) => component.component === this.component);
            } else {
                return;
            }

            if (this.module) {
                console.info(
                    `$settings.component (ngOnInit): using : ${this.data.params.component} with id ${this.id}`
                );
                await this.loadConfig(this.module.template);
            }
        });

        this.ws.message$.subscribe((message: any) => {
            this.message += message;
            this.check('ngOnInit');
        });

        window.scrollTo(0, 0);
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

        console.info('$settings.component (ngOnDestroy): removing class: editmode');
        if (this.env) {
            this.env.nextClass('editmode', true);
        }

        console.info(`$settings.component (ngOnDestroy): destroying : ${this.id}`);
    }

    public evalStr: any = (str: string): any => Function(`"use strict";return (${str})`).call(this);

    public setActive: (component: string) => void = (component: string) => {
        if (component === this.component) {
            // do nothing, user is just clicking on the same;
            return;
        }

        console.info(`$settings.component (setActive): loading component: ${component}`);

        this.contentTmpl = undefined;
        this.router
            .navigate([component])
            .catch((err: Error) => console.error('$settings.component (setActive): error', err));
    };

    public socketMsg: any = (msg: any): void => {
        this.ws.msg(msg);
    };

    // eslint-disable-next-line class-methods-use-this
    public trackByFn = (index: number) => index; // or

    private loadConfig = async (template: string) => {
        await this.MCF.loadConfig(template)
            .then((res: any) => this.parseConfig(res))
            .catch(() => {
                this.errormsg = `Template ${template} not found`;
                if (!this.error) {
                    this.fatal = true; // to display the fatal error
                }
                this.error = true;
                this.check('loadConfig');
            });
    };

    private parseConfig = (config: IConfig) => {
        this.config = { ...config };

        if (this.data && this.data.config) {
            this.config = this.merge(this.config, this.data.config);
        }

        if (this.config.values) {
            this.config.values.id = this.id;
        } else {
            this.config.values = { id: this.id };
        }

        this.loaded = true;
        if (this.error) {
            this.error = false;
        }
        this.storeName = this.DSF.r_getStore(this.config.store);

        this.contentTmpl = this.module?.access?.includes(this.env.user.rolenbr)
            ? this.contentTemplate
            : this.noAccessTemplate;

        this.check('parseConfig');
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
            console.info('$settings.component (closeModal): jobdetailed to no close modal)');

            return;
        }

        this.DS.closeModal();
        this.check('checkModal');
    };

    /* the actions that happend when subscriptions for actions come in */

    private handleActions = (action: IOptions) => {
        const caseMap: { [index: string]: any } = {
            download: this.ActionDownload,
            error: this.OError,
            fromstore: this.ActionFromStore,
            modalform: this.ActionModalForm,
            reset: this.ActionReset,
            route: this.ORoute,
            select: this.ActionSelect,
            tostore: this.ActionToStore,
            update: this.ActionUpdate,
        };

        if (caseMap[action.type]) {
            caseMap[action.type](action);
            this.check('handleActions');
        }
    };

    private ActionReset = (_action: any) => {
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
    private ActionModalForm = (action: any) => {
        if (!action) {
            return;
        }

        if (action.locals && action.locals.map) {
            action.locals.map.fields.forEach((f: any) => {
                action.values[f.in] = action.values[f.out];
            });
        }

        const mopt: IModalOptions = {
            context: {
                locals: action.locals,
                values:
                    action.locals && action.locals.reset
                        ? {}
                        : !isNaN(action.index)
                        ? { ...action.values, index: action.index }
                        : action.values,
            },
            options: action.modalOptions,
            template: this.modalViewChild,
        };

        this.DS.showModal(mopt);
    };

    private ActionUpdate = async (action: any) => {
        if (this.message !== '') {
            this.message = '';
        }

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

        action.values.annotations = { ...annotations, ...action.params };
        this.MCF.postData(action.values, action.params)
            .then((proceed: any) => this.checkModal(proceed, action))
            .catch((err: Error) => console.error('$settings.component (ActionUpdate): error', err));
    };

    private ActionFromStore = async (action: any) => {
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
                    .catch((err: Error) => console.error('$settings.component (OStore-post): error', err));
            })
            .catch((err: Error) => console.error('$settings.component (Ostore): error', err));
    };

    private ActionToStore = (action: IOptions) => {
        if (!action) {
            return;
        }

        if (!action.noclose) {
            this.DS.closeModal();
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
            values: action.values,
        };

        this.MCF.dispatch({
            payload,
            type: action.locals.type,
        });
    };

    private ActionDownload = (options: any) => {
        if (options.required) {
            options.values = getRequiredFields(options.values, options.required);
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

    private ORoute = (action: IntSharedAction) => {
        if (this.DS.isOpen) {
            this.DS.closeModal();
        }

        if (action.params && action.params.route) {
            this.router
                .navigate([action.params.route])
                .catch((err: Error) => console.error('$settings.component (ORoute): error', err));
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

    private check = (from: string) => {
        console.info(`%c$settings.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
