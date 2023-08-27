import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { IError } from '@interfaces';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { IConfig, IStoreFormState } from '@mydiem/diem-forms';
import { select, Store } from '@ngrx/store';
import { catchError, take } from 'rxjs/operators';
import { modules } from '../../app.config';
import { MainCommonFunctions } from './main.common.functions';

const guard_str = '$jobdetail.routing.guard (loadData): error';

const r_getStore = (params: any): string => params.map((o: any) => o.path).join('-');

const isEmpty = (obj: any) => {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }

    return true;
};

@Injectable()
export class JobDetailRoutingGuard implements CanActivate {
    public store: Store<any>;

    private MCF: MainCommonFunctions;
    private env: Env;
    private httpService: HttpService;
    private router: Router;
    private user: any;

    public constructor(
        env: Env,
        router: Router,
        MCF: MainCommonFunctions,
        httpService: HttpService,
        store: Store<any>,
    ) {
        this.env = env;
        this.router = router;
        this.MCF = MCF;
        this.httpService = httpService;
        this.store = store;
        this.user = this.env.user;
    }

    public canActivate = async (route: ActivatedRouteSnapshot): Promise<boolean> => {
        if (this.user.authorized) {
            this.store.dispatch({
                detail: '<i class="fas fa-spinner fa-2x fa-spin"></i>&nbsp;&nbsp;&nbsp;Loading data, please wait ...',
                key: 'bl',
                type: 'INFO',
            });

            return this.verifyjobdetail(route).then(async (v: boolean) => Promise.resolve(v));
        } else {
            return Promise.reject(false);
        }
    };

    private verifyjobdetail = async (route: ActivatedRouteSnapshot): Promise<boolean> =>
        new Promise<boolean>(async (resolve) => {
            console.info('$jobdetail.routing.guard (canActivate): Allowed activation as user is allowed');
            const id: string = route.params.id;
            const id2: string = route.params.id2;
            const module: string = modules()[route.url[0].path];

            await this.MCF.loadConfig(module, true)
                .then(async (config: IConfig) => {
                    const storeName = `${config.store}.${r_getStore(route.url)}`;

                    return this.getData(storeName)
                        .then(async (data: any) => {
                            if (data) {
                                resolve(true);
                            } else {
                                const form: any = {
                                    formName: config.formName,
                                    id,
                                    key: config.baseUrl.key,
                                    id2,
                                    key2: config.baseUrl.key2,
                                    storeName,
                                    url: config.baseUrl.url,
                                };

                                await this.loadData(form, module)
                                    .then(() => {
                                        resolve(true);
                                    })
                                    .catch((err: Error) => {
                                        console.warn('$jobdetail.routing.guard (load data) => error', err);
                                        resolve(false);
                                    });
                            }
                        })
                        .catch((err: Error) => {
                            console.warn('$jobdetail.routing.guard (verify jobdetail): error', err);
                            resolve(false);
                        });
                })
                .catch(() => {
                    this.router
                        .navigate(['/500'])
                        .catch((err: Error) =>
                            console.error('$jobdetail.routing.guard (verify jobdetail): error', err),
                        );

                    resolve(false);
                });
        });

    private loadData = async (form: any, module: string): Promise<any> => {
        this.httpService.httpPost(form.url, { [form.key]: form.id, [form.key2]: form.id2 }).subscribe({
            next: async (records: any) => {
                let values: any;

                if (!records) {
                    values = {};
                } else if (Array.isArray(records)) {
                    values = records[0];
                } else {
                    values = records;
                }

                const payload: IStoreFormState = {
                    error: false,
                    form: {
                        name: form.formName,
                        valid: false,
                    },
                    loaded: true,
                    store: form.storeName,
                    target: form.storeName,
                    values,
                };

                if (isEmpty(values)) {
                    this.store.dispatch({
                        payload: false,
                        type: 'HIDE',
                    });

                    this.router
                        .navigate([`/${module}/403`])
                        .catch((routingerr: Error) => console.error(guard_str, routingerr));

                    return Promise.resolve(false);
                } else {
                    this.store.dispatch({
                        payload,
                        type: 'ADD_FORM_DATA',
                    });

                    return Promise.resolve(true);
                }
            },
            error: async (error: unknown) => {
                if (typeof error !== 'object') {
                    return;
                }

                const err = error as IError;

                console.info(guard_str, err);

                if (err?.status === 404) {
                    this.router
                        .navigate([`/${module}/404`])
                        .catch((routingerr: Error) => console.error(guard_str, routingerr));

                    return Promise.resolve(false);
                }

                this.store.dispatch({
                    detail:
                        err.error && err.error.message ? err.error.message : err.error.message || 'unspecified error',
                    type: 'ERROR',
                });

                this.router
                    .navigate([`/${module}/500`])
                    .catch((routingerr: Error) => console.error(guard_str, routingerr));

                return Promise.resolve(false);
            },
        });
    };

    private getData = async (storeName: string): Promise<boolean> =>
        new Promise((resolve, reject) =>
            this.store
                .pipe(
                    select((s: any) => s.coverage.states[storeName]),
                    catchError(async (err: unknown) => {
                        console.info(`$main.common.functions (getData): loading error for : ${storeName}`);

                        return reject(err);
                    }),
                    take(1),
                )
                // eslint-disable-next-line @typescript-eslint/promise-function-async
                .subscribe((data: any) => {
                    if (data === undefined) {
                        return resolve(false);
                    }

                    /** If there's an error .. return */
                    if (data && data.error) {
                        return reject({ err: true });
                    }
                    if (data?.values) {
                        /** in case of direct loading or only one element in store
                         * check if we have records
                         */
                        if (Object.keys(data.values).length === 0) {
                            /** here we say that we are not getting back any data so we pass back false and stop */
                            return Promise.reject(false);
                        }
                        console.info(`$main.common.functions (getData): using existing store : ${storeName}`);

                        return resolve(true);
                    } else {
                        return resolve(false);
                    }
                }),
        );
}
