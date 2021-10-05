import { URLSearchParams } from 'url';
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

export { AxiosRequestConfig } from 'axios';

export interface IAxiosError extends AxiosError {
    trace: string[];
    caller: string;
    title: string;
}

interface IAxiosResponse {
    error: any;
    ok: string;
}

export const postMsg: (options: AxiosRequestConfig) => Promise<any> = async (
    options: AxiosRequestConfig
): Promise<any> => {
    const resp: Partial<AxiosResponse> = await axios(options).catch(async (axiosError: AxiosError) => {
        const err: any = {
            code: axiosError.code || 'n/a',
            message: 'Fatal Error: Connection could not be established',
        };

        if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
            err.status = 404;
            err.trace = ['@at $axios (postMsg): no connection'];

            // no need to reject here, it's an error with the slack service so we don't want to get into a loop
        } else if (axiosError.response) {
            err.message = 'no message';
            if (axiosError.response?.data) {
                try {
                    err.message = JSON.stringify(axiosError.response.data, undefined, 2);
                } catch (_) {
                    err.message = axiosError.response.data;
                }
            }
            err.status = axiosError.response.status;
            err.statusText = axiosError.response.statusText;
            err.trace = ['@at $axios (postMsg): response'];

            // no need to reject here, it's an error with the slack service so we don't want to get into a loop
        } else {
            err.trace = ['@at $axios (postMsg): other'];
        }

        return Promise.reject(err);
    });

    if ((resp.data as unknown as IAxiosResponse).error) {
        const _resp: IAxiosResponse = resp.data as unknown as IAxiosResponse;

        return Promise.reject({
            status: resp.status,
            err: _resp.error,
            ok: _resp.ok,
            trace: ['@at $axios (postMsg) - response'],
        });
    }

    return Promise.resolve(resp.status);
};

export interface IAxiosForm {
    url: string;
    formData: URLSearchParams;
    headers: {
        Authorization: string;
        'Content-Type': string;
    };
}

export const postMsgForm: (options: IAxiosForm) => Promise<any> = async (options: IAxiosForm): Promise<any> => {
    const resp = await axios
        .post<URLSearchParams, AxiosResponse<IAxiosResponse>>(options.url, options.formData, {
            headers: options.headers,
        })
        .catch(async (axiosError: AxiosError) => {
            const err: any = {
                code: axiosError.code || 'n/a',
                message: 'Fatal Error: Connection could not be established',
            };

            if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
                err.status = 404;
                err.trace = ['@at $axios (postMsg): no connection'];

                // no need to reject here, it's an error with the slack service so we don't want to get into a loop
            } else if (axiosError.response) {
                err.message = 'no message';
                if (axiosError.response?.data) {
                    try {
                        err.message = JSON.stringify(axiosError.response.data, undefined, 2);
                    } catch (_) {
                        err.message = axiosError.response.data;
                    }
                }
                err.status = axiosError.response.status;
                err.statusText = axiosError.response.statusText;
                err.trace = ['@at $axios (postMsg): response'];

                // no need to reject here, it's an error with the slack service so we don't want to get into a loop
            } else {
                err.trace = ['@at $axios (postMsg): other'];
            }

            return Promise.reject(err);
        });

    if (resp.data?.error) {
        const _resp: IAxiosResponse = resp.data as unknown as IAxiosResponse;

        return Promise.reject({
            status: resp.status,
            err: _resp.error,
            ok: _resp.ok,
            trace: ['@at $axios (postMsg) - response'],
        });
    }

    return Promise.resolve(resp.status);
};
