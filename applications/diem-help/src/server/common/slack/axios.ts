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
            err.trace = ['@at $axios (postMsg) - no connection'];

            // no need to reject here, it's an error with the slack service so we don't want to get into a loop
            return Promise.resolve({ status: 503 });
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
            err.trace = ['@at $axios (postMsg) - response'];

            // no need to reject here, it's an error with the slack service so we don't want to get into a loop
            return Promise.resolve({ status: 503 });
        } else {
            err.trace = ['@at $axios (postMsg)'];
        }

        return Promise.reject(err);
    });

    return Promise.resolve(resp.status);
};
