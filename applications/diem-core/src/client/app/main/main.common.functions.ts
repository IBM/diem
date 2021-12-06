/* eslint-disable sonarjs/cognitive-complexity */
import { Buffer } from 'buffer';
import { saveAs } from 'file-saver';
import { DFCommonService, DFFormService, DFStoreFunctions, IStoreMessageState } from '@mydiem/diem-forms';
import { IntPayload, IntServerPayload, IntSharedAction, IntStoreState } from '@interfaces';
import { Env, HttpService, IHttpError } from '@mydiem/diem-angular-util';
import { Injectable, OnDestroy } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, skipWhile, take } from 'rxjs/operators';
import { DomHandler } from 'primeng/dom';
import { appConfig } from '../../app.config';
import { SiteStoreStatus } from '../../site/site.store';

@Injectable() /* This is #1 */
export class MainCommonFunctions implements OnDestroy {
    public FSService?: Subscription;
    public FSStore?: Subscription;
    public _historyDocs: any;
    public configSubj = new Subject<any>();
    public dataSubj = new Subject<any>();
    public dynForm: any;
    public loaded: boolean;
    public transferdata: any;
    public env: Env;

    private DFCS: DFCommonService;
    private DSF: DFStoreFunctions;
    private formService: DFFormService;
    private httpService: HttpService;
    private store: Store<any>;
    private processing: string = 'ibm-processing';

    public constructor(
        env: Env,
        DFCS: DFCommonService,
        DSF: DFStoreFunctions,
        formService: DFFormService,
        httpService: HttpService,
        store: Store<any>
    ) {
        this.env = env;
        this.DFCS = DFCS;
        this.DSF = DSF;
        this._historyDocs = [];
        this.formService = formService;
        this.httpService = httpService;
        this.loaded = false;
        this.store = store;
        this.transferdata = undefined;
    }

    public get historyDocs(): any {
        return this._historyDocs;
    }

    public set historyDoc(doc: any) {
        this._historyDocs = this._historyDocs.filter((el: any) => el.id !== doc.id);

        this._historyDocs = [doc, ...this._historyDocs];
    }

    public loadConfig = async (form: string, noParse: boolean = false): Promise<any> =>
        new Promise((resolve, reject) => {
            this.loaded = false;
            const thisForm: any = this.formService.getStoredForm(form);

            if (thisForm) {
                /** this coud be better but if we put config details always at the top we can use the first form
                 * alternative is to look up or iterate over the forms and to find that one that is a config document and provide
                 * that back
                 */
                if (thisForm.config) {
                    this.loaded = true;
                    console.info(`$main.common.functions (loadConfig): reusing => ${form}`);
                    if (!thisForm.parsed) {
                        this.parseConfig(thisForm);
                        thisForm.parsed = true;
                        this.formService.setStoredForm(form, thisForm);
                    }

                    return resolve(thisForm.config);
                } else {
                    return reject({ err: 'no config found' });
                }
            }

            console.info(`$main.common.functions (loadConfig): requesting form => ${form}`);

            this.FSService = this.formService
                .getFormProperties(`${appConfig.formsurl}${form}`)
                .pipe(
                    catchError(async () => {
                        console.info(`$main.common.functions (loadConfig): loading error for => ${form}`);
                        this.loaded = false;

                        reject({ err: true });
                    }),
                    take(1)
                )
                .subscribe((results: any) => {
                    if (results && results.config) {
                        if (!noParse) {
                            this.parseConfig(results);
                            results.parsed = true;
                        } else {
                            results.parsed = false;
                        }
                        this.formService.setStoredForm(form, results);
                        this.loaded = true;
                        resolve(results.config);
                    } else {
                        console.info(`$main.common.functions (loadConfig): no config found for form => ${form}`);
                        this.loaded = false;
                        reject({ err: true });
                    }
                });
        });

    public getData = (storeName: string): void => {
        if (storeName === undefined) {
            return console.info('$main.common.functions (getData): no storeName defined');
        }

        this.FSStore = this.store
            .pipe(
                select((s: any) => s.coverage.states[storeName]),
                catchError(async () => {
                    console.info(`$main.common.functions (getData): loading error for => ${storeName}`);
                })
            )
            .subscribe((data: any) => {
                /** f there's an error .. return */
                if (data && data.error) {
                    return this.dataSubj.next({ err: true });
                }

                if (data?.values) {
                    /** in case of direct loading or only one element in store
                     * check if we have records
                     */
                    if (data.values.length === 0) {
                        /** here we say that we are not getting back any data so we pass back false and stop */
                        return this.dataSubj.next(false);
                    }

                    this.dataSubj.next(data);
                    console.info(`$main.common.functions (getData): using existing store => ${storeName}`);
                }
            });
    };

    /**
     *
     *
     * @memberof MainCommonFunctions
     */
    public postData = async (values: any, params: any): Promise<any> =>
        new Promise((resolve) => {
            if (this.processing && document.body) {
                DomHandler.addClass(document.body, this.processing);
            }

            this.httpService
                .httpPost(params.url, values)
                .pipe(
                    catchError(async (err: IHttpError) => {
                        if (document.body && this.processing) {
                            DomHandler.removeClass(document.body, this.processing);
                        }

                        /**
                         * @description Http returns and error with an angular message
                         * message: "Http failure response for url: 500 Internal Server Error"
                         * name: "HttpErrorResponse"
                         * ok: false
                         * status: 500
                         * statusText: "Internal Server Error"
                         * error: return from server.
                         */

                        if (err.error && typeof err.error === 'object' && err.error.displayerr) {
                            this.DFCS.formChanged({
                                message: err.error.displayerr,
                                type: 'error',
                            });

                            return resolve(false);
                        }

                        this.DFCS.formChanged({ action: 'close' });
                        const m: string = 'Error Happened';
                        const detail: string =
                            err.error && typeof err.error === 'object'
                                ? err.error.message && typeof err.error.message === 'string'
                                    ? err.error.message
                                    : typeof err.error === 'string'
                                    ? err.error
                                    : m
                                : err.message
                                ? err.message
                                : m;

                        this.dispatchmsg({
                            detail,
                            type: 'ERROR',
                            key: 'tr',
                        });

                        resolve(false);
                    }),
                    skipWhile((v: any) => !v),
                    take(1)
                )
                .subscribe((serverPayload: IntServerPayload) => {
                    let proceed: boolean = true;
                    console.info('$main.common.functions (postData): received data');

                    /* flatten the calues and merge them with the response from the server */

                    if (serverPayload.payload) {
                        /* we have back a payload so first if not an arry turn it into an arry, then handle */

                        serverPayload.payload.forEach((load: IntPayload) => {
                            const payload: IntPayload = {
                                key: load.key,
                                loaded: load.loaded ? load.loaded : true,
                                options: load.options,
                                store: load.forcestore ? load.forcestore : this.DSF.r_getStore(load.store),
                                type: load.type,
                                unshift: load.unshift || !!params.unshift,
                                values: load.values,
                            };
                            this.dispatch({
                                payload,
                                type: load.type,
                            });
                        });
                    }

                    /* if it's a new request then reroute to the new request */

                    if (serverPayload.actions) {
                        serverPayload.actions.forEach((action: IntSharedAction) => {
                            this.DFCS.formChanged(action);
                        });
                    }

                    if (serverPayload.proceed === false) {
                        proceed = false;
                    }

                    if (serverPayload.success === true) {
                        this.dispatchmsg({
                            detail: serverPayload.message || 'Completed',
                            type: SiteStoreStatus.SUCCESS,
                            key: 'br',
                        });
                    }

                    if (serverPayload.success === false) {
                        this.dispatchmsg({
                            detail: serverPayload.message || 'Completed',
                            type: SiteStoreStatus.ERROR,
                            key: 'br',
                        });
                    }

                    if (document.body && this.processing) {
                        DomHandler.removeClass(document.body, this.processing);
                    }

                    resolve(proceed);
                });
        });

    /**
     * Dispatched data to a store
     *
     * @param {IntStoreState} data Store records
     * @return void
     * @memberof MainCommonFunctions
     */
    public dispatch = (data: IntStoreState): void => {
        this.store.dispatch(data);
    };

    /**
     * Dispatches a message to the site store
     *
     * @param {IStoreMessageState} data Store records
     * @return void
     * @memberof MainCommonFunctions
     */
    public dispatchmsg = (data: IStoreMessageState): void => {
        this.store.dispatch(data);
    };

    public download = (values: any, params: any) => {
        this.dispatchmsg({
            detail: `Downloading ${values.name || values.file || params.file}, please wait ... `,
            key: 'bl',
            type: SiteStoreStatus.INFO,
        });

        this.httpService
            .download(values, params)
            .pipe(debounceTime(200), take(1))
            .subscribe(
                (file: any) => {
                    let blob: any;
                    let name: string;

                    if (file.filename && file.data) {
                        blob = new Blob([Buffer.from(file.data, 'binary')], {
                            type: file.contenttype || values.type,
                        });
                        //blob = new Blob(file.data, { type: file.contenttype || values.type });
                        name = file.filename;
                    } else {
                        blob = new Blob([file.data], { type: values.type });
                        name = values.name || values.file || params.file;
                    }

                    setTimeout(() => {
                        saveAs(blob, name);
                    }, 500);
                },
                async (err: IHttpError) => {
                    this.dispatchmsg({
                        detail: err.message ? err.message : 'Error Happened',
                        type: SiteStoreStatus.ERROR,
                        key: 'tr',
                    });
                    this.DFCS.formChanged({ action: 'close' });
                }
            );
    };

    // eslint-disable-next-line class-methods-use-this
    public guid = () => {
        const _p8: any = (s: boolean) => {
            const p: string = `${Math.random().toString(16)}000000000`.substr(2, 8);

            return s ? `-${p.substr(0, 4)}-${p.substr(4, 4)}` : p;
        };
        const t: string = _p8(false) + _p8(true) + _p8(true) + _p8(false);

        return t.toLowerCase();
    };

    public ngOnDestroy(): void {
        if (this.FSService) {
            this.FSService.unsubscribe();
        }
        if (this.FSStore) {
            this.FSStore.unsubscribe();
        }
        console.info('$main.common.functions (ngOnDestroy): destroying subscriptions');
    }
    /**
     * function used by the request to get data from a store
     *
     * @memberof MainCommonFunctions
     */

    public getFromStore = async (store: string) =>
        new Promise((resolve) => {
            this.store
                .pipe(
                    select((s: any) => s.coverage.states[store]),
                    take(1)
                )
                .subscribe((data: any) => {
                    resolve(data);
                });
        });

    public evalStr: any = (str: string): any => {
        try {
            return Function(`"use strict";return (${str})`).call(this);
        } catch (err) {
            console.debug('$df.menu.dropdown (handleRules) error', err);

            return false;
        }
    };

    private parseConfig = (results: any) => {
        results.forms.forEach((f: any) => {
            if (f.type === 'dynForm') {
                const questionGroups: any = this.formService.getQuestionGroups(f);
                this.formService.setStoredForm(f.id, { groups: questionGroups, specs: f });
            } else if (f.type === 'dynSection' || f.type === 'dynTabs') {
                this.formService.setStoredForm(f.id, f);
            } else {
                this.formService.setStoredForm(f.id, { specs: f });
            }

            console.info(`$main.common.functions (loadConfig): loaded => ${f.id}`);
        });
    };

    private findByKey = (o: any, id: string) => {
        /** Early return */
        if (o === null) {
            return false;
        }

        if (o.id === id) {
            return o;
        }

        let result: any;
        let p: any;

        for (p in o) {
            if (Object.prototype.hasOwnProperty.call(o, p) && typeof o[p] === 'object') {
                result = this.findByKey(o[p], id);

                if (result) {
                    return result;
                }
            } else if (o[p] instanceof Array) {
                for (const i in o[p]) {
                    if (i in o[p]) {
                        result = this.findByKey(i, id);

                        if (result) {
                            return result;
                        }
                    }
                }
            }
        }

        return result;
    };
}
