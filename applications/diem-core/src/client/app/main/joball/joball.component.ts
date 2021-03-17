/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
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
import { Env } from '@mydiem/diem-angular-util';
import { Subscription } from 'rxjs';
import { DFCommonService, DFStoreFunctions, IConfig, IModalOptions, IOptions } from '@mydiem/diem-forms';
import { IntClientAnnotations } from '@interfaces';
import { fadeInAnimation } from '../main.animation';
import { DialogService } from '../main.api';
import { MainCommonFunctions } from '../main.common.functions';
import { SocketService } from '../socket.api';
import { tmpl } from './templates/joball.pug.tmpl';

@Component({
    animations: [fadeInAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class JobAllComponent implements OnInit, OnDestroy {
    @ViewChild('modalViewChild', { static: false }) public modalViewChild!: TemplateRef<any>; /** ! Will com later */

    @ViewChild('header', { static: false })
    public header!: TemplateRef<any>; /** ! Will com later */

    public tableLoaded: boolean = false; /** a flag to indicate the table is not loaded */
    public loaded: boolean;
    public error: boolean = false;
    public env: Env;
    public config!: IConfig; /** ! Will com later */
    public MCF: MainCommonFunctions;
    public headerTmpl?: TemplateRef<any>;

    private tableApi!: Subscription; /** ! Will com later */
    private subscription!: Subscription; /** ! Will com later */
    private router: Router;
    private routeData!: Subscription; /** ! Will com later */
    private route: ActivatedRoute;
    private module?: string;
    private formSub!: Subscription; /** ! Will com later */
    private cd: ChangeDetectorRef;
    private DFCS: DFCommonService;
    private DS: DialogService;
    private DSF: DFStoreFunctions;
    private ws: SocketService;

    public constructor(
        cd: ChangeDetectorRef,
        DS: DialogService,
        DSF: DFStoreFunctions,
        env: Env,
        MCF: MainCommonFunctions,
        DFCS: DFCommonService,
        route: ActivatedRoute,
        router: Router,
        ws: SocketService
    ) {
        this.env = env;
        this.DS = DS;
        this.DSF = DSF;
        this.MCF = MCF;
        this.route = route;
        this.cd = cd;
        this.DFCS = DFCS;
        this.router = router;
        this.loaded = false;
        this.ws = ws;
    }
    public ngOnInit(): void {
        this.tableApi = this.DFCS.form$.subscribe(() => {
            this.tableLoaded = true; /** we have a table */
            //' this.check(bla);
        });
        /** let's make sure nothing is rendered until the config is loaded  */
        this.loaded = false;
        /** empty the config to start with
         * this.config = {};
         * listin to the route resolver in main routing till the component get's in
         */
        this.routeData = this.route.data.subscribe(async (data: any) => {
            this.module = data.component;
            console.info(`$joball.component (ngOnInit): loading ${this.module}`);
            if (this.module) {
                await this.MCF.loadConfig(this.module)
                    .then((res: any) => {
                        this.parseConfig(res);
                    })
                    .catch(() => {
                        this.loaded = false;
                        this.error = true;
                    });
            }
        });

        this.formSub = this.DFCS.form$.subscribe((options: IOptions) => this.handleActions(options));
    }
    public ngOnDestroy(): void {
        this.loaded = false;
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        if (this.tableApi) {
            this.tableApi.unsubscribe();
        }

        if (this.formSub) {
            this.formSub.unsubscribe();
        }

        if (this.routeData) {
            this.routeData.unsubscribe();
        }
        console.info(`$joball.component (ngOnDestroy): destroying ${this.module}`);
    }

    public socketMsg: any = (msg: any): void => {
        this.ws.msg(msg);
    };

    public handleActions = (action: IOptions) => {
        const caseMap: { [index: string]: any } = {
            download: this.ActionDownload,
            fromstore: this.ActionFromStore,
            modalform: this.ActionModalForm,
            route: this.ActionRoute,
            update: this.ActionUpdate,
        };

        if (caseMap[action.type]) {
            caseMap[action.type](action);
            this.check(`handleActions: ${action.type}`);
        }
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
                    .catch((err: Error) => console.error('$jobdetail.component (OStore-post): error', err));
            })
            .catch((err: Error) => console.error('$jobdetail.component (Ostore): error', err));
    };

    private ActionUpdate = async (action: any) => {
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
            .catch((err: Error) => console.error('$request.component (OStore-post): error', err));
    };

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

    private ActionRoute = (options: any) => {
        let route: string | undefined = options.route
            ? options.route
            : options.values && Array.isArray(options.values)
            ? options.values[0]
            : undefined;

        if (options.params && options.params.route) {
            route =
                options.params.key && options.values /** && options.values.length > 0 */
                    ? options.params.route + options.values[options.params.key]
                    : options.params.route;
        }

        if (!route) {
            return;
        }

        this.router
            .navigate([route])
            .catch((err: Error) => console.error('$joball.component (handleActions): error', err));
    };

    private ActionDownload = (options: any) => {
        this.MCF.download(options.values.query, options.params);
    };

    private checkModal = (proceed: boolean, options: any) => {
        /** prevent the modal to be closed */
        if (!proceed || (options.params && options.params.keepModal)) {
            console.info('$jobdetail.component (closeModal): jobdetailed to no close modal)');

            return;
        }

        this.DS.closeModal();
        this.check('checkModal');
    };

    private parseConfig = (config: IConfig) => {
        this.config = config;
        this.loaded = true;

        const self: { [index: string]: any } = this;
        if (self[this.config.headerTmpl]) {
            this.headerTmpl = self[this.config.headerTmpl];
        }

        this.check('parseConfig');
    };

    private check = (from: string) => {
        console.info(`%c$joball.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
