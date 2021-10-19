/* eslint-disable max-len */
import { URLSearchParams } from 'url';
import axios, { AxiosResponse } from 'axios';
import { IArgsBody, IError } from '@interfaces';
import { utils } from '@common/utils';
import { slackDebug } from '@common/slack/slack.debug';
import { IAxiosError, IAxiosForm, postMsgForm } from '@common/slack/axios';
import { api } from '../routes';
import { replyMethod } from './message.handler';

const services_url: string | undefined = process.env.services_url;

const token: string | undefined = process.env.diem_token;
const bot_token: string | undefined = process.env.bot_token;

export const serviceHandler: (payload: any, body: IArgsBody) => Promise<boolean | any> = async (
    payload: any,
    body: IArgsBody
): Promise<boolean | any> => {
    if (!services_url) {
        utils.logInfo('$service.handler (serviceHandler): no service_url');
        void replyMethod(
            payload,
            body,
            'Sorry, something went wrong',
            'Sorry, something went wrongPlese try later again'
        );

        return Promise.resolve(null);
    }

    if (!token) {
        utils.logInfo('$service.handler (serviceHandler): no token');
        void replyMethod(
            payload,
            body,
            'Sorry, something went wrong',
            'Sorry, something went wrongPlese try later again'
        );

        return Promise.resolve(null);
    }

    // if it's not a mongoose id, the reply to the user that it's not a valid id
    if (!body.id?.match(/^[0-9a-fA-F]{24}$/)) {
        void replyMethod(payload, body, 'Sorry, this is an invalid id', `Sorry, but this is an invalid id: ${body.id}`);

        return Promise.resolve(null);
    }

    const result: AxiosResponse<IArgsBody> = await axios
        .post<any>(services_url, body, {
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

    // start with setting some default data

    if (!(result.data as any)?.out) {
        return Promise.resolve(null);
    }

    const response: any = (result.data as any).out;

    if ((result.data as any).error) {
        /* if there is an error then out will probaly be a message with some generic text
         * so we will log the response with the error
         */

        void slackDebug('$service.handler (serviceHandler): error response', result.data);
    } else {
        void slackDebug('$service.handler (serviceHandler): response', result.data);
    }

    /* response method is a slack specific action
     * like chat.post
     * to be returned by the backend
     */
    if (response.method) {
        await api.callAPIMethodPost(response.method, response.payload);

        return Promise.resolve(null);
    }

    /*  the part where we are not using slack methods in the code themselved */

    let out: any = 'No Result';
    const text: string = `Your data for ${body.params.action || 'your request'}`;
    const channel: string = payload.channel;
    const thread_ts = payload.thread_ts || payload.ts;

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

    // if the length is > 1000 we will sent the response as a snippet to the user
    if (out.length > 1000) {
        if (out.length > 100000) {
            out = 'Sorry, but your request exceeded the maximum limit of 100.000 lines';
        }

        const params: { [index: string]: any } = {
            channels: channel,
            title: body.id,
            filetype: 'javascript',
            thread_ts,
            content: out,
        };

        const formData = new URLSearchParams();

        Object.keys(params).forEach((key) => {
            formData.append(key, params[key]);
        });

        const options: IAxiosForm = {
            formData,
            url: 'https://slack.com/api/files.upload',
            headers: { Authorization: `Bearer ${bot_token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        };

        const resp: any = await postMsgForm(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '@at $service.handler (Mslacksg): postMsg');

            return utils.logErr(`$service.handler (serviceHandler): length:${out.length} error`, err);
        });

        utils.logInfo(`$service.handler (serviceHandler): slack reply status: ${resp}`);

        return Promise.resolve(null);
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

    return Promise.resolve(null);
};
