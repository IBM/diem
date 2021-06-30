/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 *
 * @module slack
 */

import { ISlack, utils } from '../utils';
import { postMsg, IAxiosError, AxiosRequestConfig } from './axios';

const token: string | undefined = process.env.bot_token;

export const slackDebug: (title: string, data: any) => Promise<void> = async (
    title: string,
    data: any
): Promise<void> => {
    const slack: ISlack = utils.slack;

    if (!slack.url || !slack || !slack.deploy || !slack.debug.channel) {
        utils.logInfo(`$slack.debug (slackMsg): no deploy channel on ${utils.Env.K8_SYSTEM_NAME}`);

        return Promise.resolve();
    }

    const new_data: any = JSON.parse(JSON.stringify(data));

    let json: string = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');

    if (json.length > 8000 && new_data.params?.payload) {
        if (typeof new_data.params.payload === 'string') {
            new_data.params.payload = `truncated for size: ${new_data.params.payload.substring(0, 100)}`;
        } else {
            new_data.params.payload = 'truncated for size';
        }

        json = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');
    }

    if (json.length > 8000 && new_data.params?.event) {
        new_data.params.event = 'truncated for size';
        json = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');
    }

    if (json.length > 8000) {
        json = `truncated for size: ${json.substring(0, 1000)}`;
    }

    const params: any = {
        channels: slack.debug.channel,
        content: json,
        title: title || 'Slack Backend Response',
        filetype: 'javascript',
    };

    const options: AxiosRequestConfig = {
        params,
        method: 'POST',
        url: 'https://slack.com/api/files.upload',
        headers: { Authorization: `Bearer ${token}` },
    };

    const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
        err.trace = utils.addTrace(err.trace, '@at $slack.debug (slackMsg): postMsg');

        utils.logErr('$slack.debug (slackMsg): error', err);

        return Promise.resolve();
    });

    utils.logInfo(`$slack.debug (slackMsg): reply status: ${response}`);

    return Promise.resolve();
};
