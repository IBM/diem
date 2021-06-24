/* eslint-disable max-len */
import axios from 'axios';
import { IArgsBody, IError } from '@interfaces';
import { utils } from '@common/utils';
import { api } from '../routes';

const services_url: string | undefined = process.env.services_url;

const token: string | undefined = process.env.diem_token;

export const serviceHandler: (payload: any, body: IArgsBody) => Promise<boolean | any> = async (
    payload: any,
    body: IArgsBody
): Promise<boolean | any> => {
    if (!services_url) {
        utils.logInfo('$service.handler (serviceHandler): no service_url');

        return Promise.resolve(false);
    }

    const result = await axios
        .post(services_url, body, {
            headers: { 'x-api-key': token },
        })
        .catch(async (err: IError) => {
            const error: any = {
                trace: ['@at $service.handler (serviceHandler) - axios'],
                message: 'Axios post error',
                url: services_url,
                err: err.response?.data ? err.response.data : 'no data',
            };

            return Promise.reject(error);
        });

    console.info('body logger:', body);

    // start with setting some default data

    if (!result?.data?.out) {
        console.info('result.data', result.data);

        return Promise.resolve(false);
    }

    const response: any = result.data.out;

    console.info('response logger', response);

    if (response.method) {
        await api.callAPIMethodPost(response.method, {
            ...response.payload,
        });

        return Promise.resolve(false);
    }

    /*  the part where we are not using slack methods in the code themselved */

    let out: any = 'No Result';
    const text: string = `Your data for ${body.params.action || 'your request'}`;
    const channel: string = payload.channel;
    const thread_ts = payload.thread_ts || payload.ts;

    //console.info('result', payload);

    /* out could be a string, an object to be parsed or a form
     * only in case of an object , we stringify it
     * the field blocks will tell us it's a form and the data should not be parsed
     */
    if (typeof response !== 'string') {
        try {
            out = JSON.stringify(response, null, 2);
        } catch (err) {
            // just continue
        }
    } else {
        out = response;
    }

    // the default for slack blocks
    const blocks: any[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `\`\`\`${out}\`\`\``,
            },
        },
    ];

    // post the message
    await api.callAPIMethodPost(
        'chat.postMessage',

        {
            thread_ts,
            channel,
            block_id: body.id,
            text,
            blocks,
        }
    );

    return Promise.resolve(false);
};
