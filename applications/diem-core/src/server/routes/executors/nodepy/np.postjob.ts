/* eslint-disable @typescript-eslint/quotes */

import axios, { AxiosError } from 'axios';
import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { pubSub } from '@config/pubsub';
import { addTrace } from '../../shared/functions';
import { EJobStatus, IETLJob } from '@models';

export interface INodePyJob extends IETLJob {
    code: string;
}

const axiosErrHandler: (axiosError: AxiosError, id: string) => IError = (
    axiosError: AxiosError,
    id: string
): IError => {
    const err: any = {
        code: axiosError.code || 'n/a',
        message: 'Internal error: something went wrong',
    };

    if (err.code === 'ENOTFOUND') {
        err.message = 'Fatal Error: Connection to the backend could not be established';
        err.status = 404;
        err.trace = ['@at $nodepy.postjob (postJob) - no connection'];
    } else if (axiosError.response) {
        err.message =
            axiosError.response && axiosError.response.data
                ? axiosError.response.data.message
                    ? axiosError.response.data.message
                    : JSON.stringify(axiosError.response.data, undefined, 2)
                : 'no message';
        err.status = axiosError.response.status;
        err.statusText = axiosError.response.statusText;
        if (axiosError.response.data && axiosError.response.data.trace) {
            err.trace = addTrace(axiosError.response.data.trace, '@at $nodepy.postjob (postJob) - response');
        } else {
            err.trace = ['@at $nodepy.postjob (postJob) - response'];
        }
    } else {
        err.trace = ['@at $nodepy.postjob (postJob)'];
    }

    /* we don't report an error as this will be done via the pubsub   return Promise.reject(err); */
    void utils.logError(`$nodepy.postjob (postJob): failed for job: ${id}`, err);

    return err;
};

export const nodePyPostJob: (postjob: INodePyJob) => Promise<void> = async (postjob: INodePyJob): Promise<void> => {
    const url: string = 'http://nodepy/api';

    await axios.post(`${url}`, postjob).catch(async (axiosError: AxiosError) => {
        const err: IError = axiosErrHandler(axiosError, postjob.id);

        utils.logInfo(`$nodepy.postjob (postJob): error from nodepy - job: ${postjob.id}`, `ti: ${postjob.transid}`);

        void pubSub.publish({
            ...postjob,
            count: null,
            jobend: new Date(),
            jobstart: new Date(),
            runtime: null,
            error: err.message,
            status: EJobStatus.failed,
        });

        return Promise.resolve();
    });

    // we publish first the job , any error will handled later
    void pubSub.publish({
        ...postjob,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
        status: EJobStatus.submitted,
    });

    return Promise.resolve();
};
