/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 *
 * @module slack
 */

import { URLSearchParams } from 'url';
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

        return;
    }

    const new_data: any = JSON.parse(JSON.stringify(data));

    new URLSearchParams();

    let json: string = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');

    if (json.length > 8000 && new_data.params?.payload) {
        new_data.params.payload = `truncated for size: ${new_data.params.payload.substring(0, 100)}`;
        json = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');
    }

    if (json.length > 8000 && new_data.params?.event) {
        new_data.params.event = 'truncated for size';
        json = JSON.stringify(new_data, null, 2).replace(/`/g, '/`');
    }

    if (json.length > 8000) {
        json = `truncated for size: ${json.substring(0, 1000)}`;
    }

    const params = new URLSearchParams();

    params.append('channels', slack.debug.channel);
    params.append('content', json);
    params.append('title', title || 'Slack Backend Response');
    params.append('filetype', 'javascript');

    const options: AxiosRequestConfig = {
        params,
        method: 'POST',
        url: 'https://slack.com/api/files.upload',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded' },
    };

    if (!process.env.disableslack) {
        const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '@at $slack (slackMsg): postMsg');

            return utils.logErr('$slack.debug (slackMsg): error', err);
        });

        utils.logInfo(`$slack.debug (slackMsg): reply status: ${response}`);
    } else {
        utils.logErr('$slack.debug (slackMsg): slack disabled');
    }
};
