import axios, { AxiosResponse } from 'axios';
import { IError } from '@interfaces';
import { utils } from '@common/utils';
import { slackDebug } from '@common/slack/slack.debug';

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

    if (!token) {
        const error: any = {
            trace: ['@at service.doc (loadServiceDoc)'],
            message: 'No token',
            url: services_url,
        };

        void utils.logError('$service.doc (loadServiceDoc) - token', error);

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
                trace: ['@at $service.doc (loadServiceDoc) - axios'],
                message: 'Axios services post error',
                url: services_url,
                id: service_doc,
                err: err.response?.data ? err.response.data : 'no data',
            };

            void utils.logError('$service.doc (loadServiceDoc)', error);

            return;
        });

    if (response?.data?.out) {
        void slackDebug('$service.doc (loadServiceDoc): response', response.data);
        services = response.data.out;
    }

    utils.logInfo(`$service.doc (loadServiceDoc) - service doc: ${service_doc} - service url: ${services_url}`);
};

export const reloadServiceDoc = async () => {
    void loadServiceDoc();
};
