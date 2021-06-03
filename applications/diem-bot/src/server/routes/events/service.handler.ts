/* eslint-disable max-len */
import axios from 'axios';
import { IArgsBody } from '@interfaces';
import { api } from '../routes';

const services_url: string = 'https://bizops.ibm.com/etl-mgr/api/services';

const token: string | undefined = process.env.diem_token;

export const serviceHandler = async (payload: any, body: IArgsBody): Promise<any> => {
    const result = await axios.post(services_url, body, {
        headers: { 'x-api-key': token },
    });

    console.info('body', body);

    // start with setting some default data

    if (!result?.data?.out) {
        console.info('result.data', result.data);

        return;
    }

    const response: any = result.data.out;

    console.info('response', response);

    if (response.method) {
        await api.callAPIMethodPost(response.method, {
            ...response.payload,
        });

        return;
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
};
