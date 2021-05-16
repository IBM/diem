/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-underscore-dangle */
import { Injectable } from '@angular/core';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { merge } from 'lodash-es';
import { DomHandler } from 'primeng/dom';
import { IForm, ILocals, IParams, IStoreFormState, IStoreTableState } from './definitions/interfaces';

/**
 *
 *
 * @export
 * @class DFStoreFunctions
 */
@Injectable()
export class DFStoreFunctions {
    public store: Store<any>;

    private appConfig: any;
    private env: Env;
    private httpService: HttpService;
    private processing: string = 'ibm-processing';
    private router: Router;

    public constructor(store: Store<any>, httpService: HttpService, env: Env, router: Router) {
        this.store = store;
        this.httpService = httpService;
        this.env = env;
        this.router = router;
    }

    public initStore(store: string, query: any, loaded: boolean = false): void {
        this.store.dispatch({
            payload: {
                loaded,
                query,
                store,
            },
            type: 'ADD_STORE',
        });
    }

    public resetStore(store: string, loaded: boolean = false): void {
        this.store.dispatch({
            payload: {
                loaded,
                store,
            },
            type: 'RESET_STORE',
        });
    }

    public resetFormStore(
        store: string,
        form: { values: any; loaded?: boolean; form: { name: string; valid: boolean } }
    ): void {
        this.store.dispatch({
            payload: {
                form: form.form,
                loaded: !!form.loaded,
                store,
                values: form.values,
            },
            type: 'RESET_FORM_STORE',
        });
    }

    /**
     * This updates the store
     *
     * @param {IStoreFormState} payload
     * @memberof DFStoreFunctions
     */
    public updateForm(payload: IStoreFormState): void {
        this.store.dispatch({
            payload,
            type: 'ADD_FORM_DATA',
        });
    }

    /**
     * Loads a form
     *
     * @param {IParams} params parameter meta data
     * @param {IForm} locals local meta data
     * @param {string} storeName the name of the store
     * @return void
     * @memberof DFStoreFunctions
     */
    public loadForm(params: IParams, locals: IForm, storeName: string): void {
        const url: string | undefined = locals.url;

        if (!url) {
            return;
        }

        const values: any = locals.flatten === undefined ? true : locals.flatten;

        this.httpService.httpPost(url, params, values).subscribe(
            (records) => {
                let vals: any = records;
                /** data can come in also in array , in that case we turn into an object  */
                if (Array.isArray(records)) {
                    vals = records[0];
                }
                if (vals === undefined) {
                    vals = {};
                }

                const payload: IStoreFormState = {
                    error: false,
                    form: {
                        name: locals.formName,
                        valid: false,
                    }, // in case we want to load for one form
                    loaded: true,
                    store: storeName,
                    target: storeName,
                    values: vals,
                };

                this.store.dispatch({
                    payload,
                    type: 'ADD_FORM_DATA',
                });

                return true;
            },
            (err) => {
                const payload: IStoreFormState = {
                    error: true,
                    form: {
                        name: locals.formName,
                        valid: false,
                    },
                    loaded: false,
                    store: storeName,
                    target: storeName,
                    values: {},
                };
                this.store.dispatch({
                    payload,
                    type: 'ADD_FORM_DATA',
                });
                this.siteError(err.error && err.error.message ? err.error.message : err.message ? err.message : err);
                this.toSlack(url, storeName, err);
            }
        );
    }

    public loadStore(params: IParams, locals: ILocals, storeName: string): void {
        const url: string | undefined = locals.url;

        if (!url) {
            return;
        }

        if (document.body && this.processing) {
            DomHandler.addClass(document.body, this.processing);
        }

        const values: any = locals.flatten === undefined ? true : locals.flatten;
        this.httpService.httpPost(url, params, values).subscribe(
            (records) => {
                const payload: IStoreTableState = {
                    empty: this.getEmpty(records),
                    error: false,
                    loaded: true,
                    query: params.query,
                    records: Array.isArray(records) ? records : [],
                    store: storeName,
                    totalRecords: this.getNbr(records),
                };

                this.store.dispatch({
                    payload,
                    type: locals.type,
                });

                if (document.body && this.processing) {
                    DomHandler.removeClass(document.body, this.processing);
                }
            },
            (err) => {
                const payload: IStoreTableState = {
                    empty: true,
                    error: true,
                    loaded: true,
                    query: {},
                    records: [],
                    store: storeName,
                    totalRecords: 0,
                };

                this.store.dispatch({
                    payload,
                    type: locals.type,
                });
                this.siteError(err.error && err.error.message ? err.error.message : err.message ? err.message : err);
                this.toSlack(url, storeName, err);
                if (document.body && this.processing) {
                    DomHandler.removeClass(document.body, this.processing);
                }
            }
        );
    }

    public siteError = (detail: string) => {
        this.store.dispatch({
            detail,
            type: 'ERROR',
        });
    };

    /**
     * Generates a slack error message
     *
     * @param {url} url the slack url
     * @param {storeName} storeName the name of the store
     * @param {Error} error the error message
     * @return void
     * @memberof DFStoreFunctions
     */
    public toSlack = (url: string, storeName: string, err: Error): void => {
        this.appConfig = this.env.getField('appConfig');

        const errMsg: string = err.message ? err.message : err.toString();

        this.httpService
            .httpPost(this.appConfig.slackurl, {
                msg: {
                    error: errMsg,
                    location: '$df.store.functions',
                    store: storeName,
                    transids: this.env.getField('transids') || [],
                    url,
                    user: this.env.user.email,
                },
            })
            .subscribe(
                () => {
                    console.info('$store.function (http post to slack) => Slack sent');
                },
                (error) => {
                    console.info('$store.function (http post to slack error) => Slack error', error);
                }
            );
    };

    public loadNode = async (params: IParams, locals: ILocals): Promise<any> =>
        new Promise((resolve, reject) => {
            const url: string | undefined = locals.url;

            if (!url) {
                return;
            }

            this.httpService.httpPost(url, params).subscribe(
                (records) => resolve(records),
                (err) => {
                    reject();

                    this.httpService
                        .httpPost(this.appConfig.slackurl, {
                            msg: ` error => user => ${this.env.user.email} | msg => ${err._body}`,
                        })
                        .subscribe(
                            () => {
                                console.info('$store.function (http post to slack) => Slack sent');
                            },
                            (error) => {
                                console.info('$store.function (http post to slack error) => Slack error', error);
                            }
                        );
                }
            );
        });

    /**
     * Returns a new merged object
     *
     * @param A any object
     * @param B any object
     * @return a new merged object
     * @type {*}
     * @memberof DFStoreFunctions
     */
    public OA: any = (A: any, B: any): any => {
        if (A === undefined || A === null) {
            if (B === undefined || B === null) {
                return {};
            } else {
                return B;
            }
        }

        return { ...A, ...B };
    };

    public OAA: any = (A: any, B: any): any => {
        if (A === undefined || A === null) {
            if (B === undefined || B === null) {
                return {};
            } else {
                return B;
            }
        }

        return (Object as any).assign(A, B);
    };

    public r_qP: (route: any) => {} = (route: any): any => {
        let obj: any = {};
        route.queryParams.forEach((params: IParams) => {
            const t: { [index: string]: any } = params;
            for (const p in t) {
                if (Object.prototype.hasOwnProperty.call(t, p)) {
                    obj = (Object as any).assign({}, obj, {
                        [p]: t[p],
                    });
                }
            }
        });

        return obj;
    };

    public r_PP: (route: any) => {} = (route: any): any => {
        let obj: any = {};
        route.parent.params.forEach((params: IParams) => {
            const tt: { [index: string]: any } = params;
            for (const p in tt) {
                if (Object.prototype.hasOwnProperty.call(tt, p)) {
                    obj = (Object as any).assign({}, obj, {
                        [p]: tt[p],
                    });
                }
            }
        });

        return obj;
    };

    public r_P: (route: any) => {} = (route: any): any => {
        let obj: any = {};
        route.params.forEach((params: IParams) => {
            const ttt: { [index: string]: any } = params;
            for (const p in ttt) {
                if (Object.prototype.hasOwnProperty.call(ttt, p)) {
                    obj = (Object as any).assign({}, obj, {
                        [p]: ttt[p],
                    });
                }
            }
        });

        return obj;
    };

    /**
     * returns the store name (that is coputed with url path)
     *
     * @param {string} store the store name
     * @return {string} The computed store name
     * @memberof DFStoreFunctions
     */
    public r_getStore: (store: string) => string = (store: string): string => {
        const tree: any = this.router.parseUrl(this.router.url);
        let storeName: string = tree.root.children.primary.segments.join('-');
        const params: any = tree.queryParams;
        for (const p in params) {
            if (Object.prototype.hasOwnProperty.call(params, p)) {
                storeName += `-${params[p]}`;
            }
        }

        return `${store}.${storeName}`;
    };

    public r_getLastUrlPart: () => string = (): string => {
        const tree: any = this.router.parseUrl(this.router.url);

        return tree.root.children.primary.segments.pop().path;
    };

    public getNbr: (records: any) => number = (records: any): number => {
        if (records.length === 0) {
            return 0;
        } else if (records[0] && records[0].nbr) {
            return records[0].nbr;
        } else {
            return records.length;
        }
    };

    public getEmpty: (records: any) => boolean = (records: any): boolean => records.length === 0;

    public flatten = (val: any): any => {
        val.forEach((v: any) => {
            if (Object.prototype.toString.call(val) === '[object Date]' && typeof v === 'object') {
                merge(val, v);
            }
        });

        return val;
    };
}
