import axios, { AxiosResponse } from 'axios';
import { IError } from '@interfaces';
import { utils } from '@common/utils';

const services_url: string | undefined = process.env.services_url;
const service_doc: string | undefined = process.env.service_doc;
const token: string | undefined = process.env.diem_token;

export let services: [{ id: string; name: string }] | null = null;

export const loadServiceDoc = async () => {
    if (!services_url) {
        const error: any = {
            trace: ['@at service.doc (loadServiceDoc)'],
            message: 'No Services url',
            url: services_url,
        };

        void utils.logError('$service.doc (loadServiceDoc) - services_url', error);

        return;
    }

    const response: AxiosResponse<any> | void = await axios
        .post(
            services_url,
            { id: service_doc },
            {
                headers: { 'x-api-key': token },
            }
        )
        .catch(async (err: IError) => {
            const error: any = {
                trace: ['@at $service.doc (serviceHandler) - axios'],
                message: 'Axios post error',
                url: services_url,
                err: err.response?.data ? err.response.data : 'no data',
            };

            void utils.logError('$service.doc (loadServiceDoc) - view_submission', error);

            return;
        });

    if (response?.data?.out) {
        console.info(response.data.out);
        services = response.data.out;
    }

    utils.logInfo(`$service.doc (loadServiceDoc) - service doc: ${service_doc} - service url: ${services_url}`);
};
