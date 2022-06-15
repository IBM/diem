import { ErrorHandler, Injectable } from '@angular/core';
import { Env, HttpService } from '@mydiem/diem-angular-util';
import { DFCommonService } from '@mydiem/diem-forms';
import { appConfig } from './app.config';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
    private httpService: HttpService;
    private env: Env;
    private tmpMsg?: string;
    private CS: DFCommonService;

    public constructor(httpService: HttpService, env: Env, CS: DFCommonService) {
        this.httpService = httpService;
        this.env = env;
        this.CS = CS;
    }

    /**
     * Dispatches a red box on user screen and post the error message to sloack
     *
     * @param {Error} err the error object
     * @return void
     */
    public handleError(err: Error): void {
        if (document.body) {
            this.CS.removeClass(document.body, 'ibm-processing');
        }

        const errMsg: string = err.message ? err.message : err.toString();

        // need to prevent that the same error is sent over and over
        if (this.tmpMsg === errMsg) {
            return;
        }

        console.warn(`$exception (handle error) => ${errMsg}`);

        this.tmpMsg = errMsg; // assign the new value

        /** do something with the exception */

        this.httpService
            .httpPost(appConfig.slackurl, {
                msg: {
                    error: errMsg,
                    file: '$app.exception',
                    folder: 'slack',
                    function: 'slackMsgError',
                    stack: err.stack ? err.stack.split('\n', 5) : '',
                    transids: this.env.getField('transids') || [],
                },
            })
            .subscribe({
                next: () => {
                    console.info('$exception (handle eror)=> Slack sent');
                },
                error: (error: unknown) => {
                    if (typeof error === 'object') {
                        const err2 = error as Error;
                        console.warn('$exception (handle error)=> Slack error', err2);
                    }
                },
            });
    }
}
