/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/indent */
import {
    HttpClient,
    HttpErrorResponse,
    HttpEvent,
    HttpEventType,
    HttpHeaders,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, last, map } from 'rxjs/operators';
import { Env } from './env';
import { DTS } from './dts';

const contenttype = 'Content-Type';

enum EPostType {
    upload = 'upload',
    download = 'download',
}

/**
 *
 * @param {HttpErrorResponse} err
 * @returns {Observable<IHttpError>}
 */
const handleError = (err: HttpErrorResponse): Observable<IHttpError> => {
    if (err.error instanceof ErrorEvent) {
        /**
         * removing the console error
         * just returning empty
         * console.error(`$http.service (client side error)`, err.statusText);
         */

        return EMPTY;
    } else {
        if (err.status === 0) {
            /**
             * removing the console error
             * just returning empty
             * console.error(`$http.service (cancelled request)`, err.statusText);
             */

            return EMPTY;
        }

        return throwError(() => err);
    }
};

/**
 * @description Http returns an error with an angular message
 *
 * **Warning: server should reply with either a string or object !**
 *
 * ```ts
 * name: "HttpErrorResponse"
 * ok: false
 * status: 500
 * statusText: "Internal Server Error"
 * error: object returned from server ```
 */
export interface IHttpError extends HttpErrorResponse {
    /** The error object from the server is either an object or string */
    error:
        | {
              [index: string]: string;
              message: string;
              transid: string;
          }
        | string;
}
/**
 * @description The angular HTTP Service. Contains methods for http calls
 *
 * @function httpGet = (url: string): Observable<any[]>
 * @function httpPost = (url: string, body: any, flatten?: boolean): Observable<any[]>
 * @function jsonpGet = (url: string, callback: any): Observable<any[]>
 * @function handleError = (err: HttpErrorResponse): any
 * @function download = (values: any, params: any): Observable<any[]>
 * @export
 * @class HttpService
 */
@Injectable()
export class HttpService {
    private headers: any;
    private http: HttpClient;
    private env: Env;
    private dts: DTS;
    private filename?: string;
    private contenttype?: string;

    public constructor(dts: DTS, env: Env, http: HttpClient) {
        this.http = http;
        this.env = env;
        this.dts = dts;
    }

    public httpGet = (url: string): Observable<HttpResponse<any> | HttpErrorResponse> =>
        this.http.get(url, this.makeHeaders()).pipe(
            map((data: any) => data),
            catchError(handleError)
        );

    public httpPost = (url: string, body: any, flatten = false): Observable<HttpResponse<any> | HttpErrorResponse> => {
        let formData: any;
        const input: any = flatten ? this.flattenObject(body) : body;
        let multiPart = false;
        if (input.files && input.files.length > 0) {
            formData = new FormData();
            for (const file of input.files) {
                if (typeof file.name === 'string') {
                    formData.append('file', file);
                }
            }
            delete input.files;
            formData.append('body', JSON.stringify(input));
            multiPart = true;

            // `return this.http.post(url, formData, this.makeHeaders(multiPart))

            return this.http
                .request(
                    new HttpRequest('POST', url, formData, {
                        headers: this.makeHeaders(multiPart).headers,
                        reportProgress: true,
                    })
                )
                .pipe(
                    map((event: HttpEvent<any>) => this.getEventMessage(event, EPostType.upload)),
                    last(),
                    catchError(handleError)
                );
        } else {
            formData = JSON.stringify(input);

            return this.http.post(url, formData, this.makeHeaders(multiPart)).pipe(
                map((data: any) => data),
                catchError(handleError)
            );
        }
    };

    public jsonpGet = (url: string, callback: any): Observable<HttpResponse<any> | HttpErrorResponse> =>
        this.http.jsonp(url, callback).pipe(
            map((data: any) => data),
            catchError(handleError)
        );

    public download = (values: any, params: any): Observable<HttpResponse<any> | HttpErrorResponse> => {
        this.filename = undefined;

        const h: any = {
            Accept: values.content_type || params.content_type || 'application/octet-stream',
            [contenttype]: 'application/json',
        };

        if (this.env.user.token) {
            h.Authorization = `Bearer ${this.env.user.token}`;
        }

        const si: string = this.env.getField('sessionid');

        if (si) {
            h['X-Correlation-ID'] = si;
        }

        const xorg: string = this.env.getField('xorg');

        if (xorg) {
            h['X-Org-Protection'] = xorg;
        }

        const transid: string = this.dts.guid();

        if (!this.env.getField('external_api')) {
            h['X-Request-Id'] = transid;
        }

        let transids: string[] = this.env.getField('transids') || [];

        transids = transids.slice(0, 4);
        transids.unshift(transid);

        this.env.setField('transids', transids);

        return this.http
            .request(
                new HttpRequest('POST', params.url, values, {
                    headers: new HttpHeaders(h),
                    reportProgress: true,
                    responseType: params.responseType || 'arraybuffer',
                })
            )
            .pipe(
                map((event: HttpEvent<any>) => this.getEventMessage(event, EPostType.download)),
                last(),
                catchError(handleError)
            );
    };

    public makeHeaders = (multiPart = false): any => {
        let h: any = {};
        if (!multiPart) {
            h = {
                [contenttype]: 'application/json',
            };
        }

        if (this.env.user.token) {
            h.Authorization = `Bearer ${this.env.user.token}`;
        }

        const si: string = this.env.getField('sessionid');

        if (si) {
            h['X-Correlation-ID'] = si;
        }

        const transid = this.dts.guid();

        // set a field with value external_api when using cors requests that don't allow this header
        if (!this.env.getField('external_api')) {
            h['X-Request-Id'] = transid;
        }

        const xorg = this.env.getField('xorg');

        if (xorg) {
            h['X-Org-Protection'] = xorg;
        }

        let transids: string[] = this.env.getField('transids') || [];

        transids = transids.slice(0, 4);
        transids.unshift(transid);

        this.env.setField('transids', transids);

        this.headers = new HttpHeaders(h);

        return { headers: this.headers };
    };

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private getEventMessage: any = (event: HttpEvent<any>, type: string) => {
        if (event.type === HttpEventType.Sent) {
            this.env.nextProgress('Connecting');
        } else if (event.type === HttpEventType.DownloadProgress && EPostType.download === type) {
            if (event.total) {
                const percentDone: number = Math.round((100 * event.loaded) / event.total);

                this.env.nextProgress(`${percentDone}% `);
            }

            return;
        } else if (event.type === HttpEventType.UploadProgress && EPostType.upload === type) {
            if (event.total) {
                const percentUploaded: number = Math.round((100 * event.loaded) / event.total);

                if (percentUploaded !== 100) {
                    this.env.nextProgress(`${percentUploaded}% `);
                } else {
                    this.env.nextProgress('100% .. hold on please, finalizing backend...');
                }
            }

            return;
        } else if (event.type === HttpEventType.ResponseHeader) {
            const contentDispositionHeader: any = event.headers.get('Content-disposition');

            if (contentDispositionHeader && contentDispositionHeader.includes('filename=')) {
                this.filename = contentDispositionHeader.split('filename=')[1];
                this.contenttype = event.headers.get(contenttype) || undefined;
            }

            return;
        } else if (event.type === HttpEventType.Response) {
            this.env.nextProgress('Completed');

            if (this.filename) {
                return {
                    contenttype: this.contenttype,
                    data: event.body,
                    filename: this.filename,
                };
            }

            return event.body;
        }
    };

    private cleanObject: any = (ob: any): any => {
        Object.keys(ob).forEach((key) => {
            if (Array.isArray(ob[key]) && ob[key].length === 0) {
                /**
                 * this will be removed as we cannot update arrays on the backend
                 * delete ob[key];
                 */
            } else if (ob[key] && typeof ob[key] === 'object') {
                this.cleanObject(ob[key]);
            } else if (ob[key] === null) {
                delete ob[key];
            }
        });

        return ob;
    };

    private flattenObject: any = (ob: any): any => {
        const toReturn: any = {};

        for (const i in ob) {
            if (!Object.prototype.hasOwnProperty.call(ob, i)) {
                continue;
            }

            if (typeof ob[i] === 'object') {
                const flatObject: any = this.flattenObject(ob[i]);
                for (const x in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                        continue;
                    }
                    toReturn[x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }

        return toReturn;
    };
}
