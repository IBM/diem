/* eslint-disable @typescript-eslint/quotes */

import axios, { AxiosError, AxiosResponse } from 'axios';
import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { addTrace } from '../shared/functions';

export interface ServicesJob {
    code: string;
    transid: string;
    id: string;
    params?: any;
}

const axiosErrHandler: (axiosError: AxiosError) => IError = (axiosError: AxiosError): IError => {
    const err: IError = {
        caller: 'ETL-mgr (Axios Error)',
        name: 'Axios Error',
        code: axiosError.code || 'n/a',
        message: 'Internal error: something went wrong',
        status: 503,
    };

    if (err.code === 'ENOTFOUND') {
        err.message = 'Fatal Error: Connection to the backend could not be established';
        err.status = 503;
        err.trace = ['@at $services.postjob (postJob) - no connection'];
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
            err.trace = addTrace(axiosError.response.data.trace, '@at $services.postjob (postJob) - response');
        } else {
            err.trace = ['@at $services.postjob (postJob) - response'];
        }
    } else {
        err.trace = ['@at $services.postjob (postJob)'];
    }

    // error needs to bubble up

    return err;
};

export const servicesPostJob: (postjob: ServicesJob) => Promise<any> = async (postjob: ServicesJob): Promise<any> => {
    const url: string = 'http://nodepy/services';

    const results: AxiosResponse<any> = await axios.post(`${url}`, postjob).catch(async (axiosError: AxiosError) => {
        const err: IError = axiosErrHandler(axiosError);

        return Promise.reject(err);
    });

    if (!results.data) {
        return Promise.resolve({
            message: 'no data available',
        });
    }

    utils.logInfo(
        `$services.postjob (postJob): success status from nodepy - job: ${postjob.id}`,
        `ti: ${postjob.transid}`
    );

    return Promise.resolve(results.data);
};
