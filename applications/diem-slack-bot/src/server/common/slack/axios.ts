import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

export { AxiosRequestConfig } from 'axios';

export interface IAxiosError extends AxiosError {
    trace: string[];
    caller: string;
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
            err.message =
                axiosError.response && axiosError.response.data
                    ? axiosError.response.data.message
                        ? axiosError.response.data.message
                        : JSON.stringify(axiosError.response.data, undefined, 2)
                    : 'no message';
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
        return Promise.reject({
            status: resp.status,
            err: resp.data.error,
            ok: resp.data.ok,
            trace: ['@at $axios (postMsg) - response'],
        });
    }

    return Promise.resolve(resp.status);
};
