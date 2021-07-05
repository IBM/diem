/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 *
 * @module slack
 */

import { URLSearchParams } from 'url';
import { ISlack, utils } from '../utils';
import { IAxiosError, postMsgForm, IAxiosForm } from './axios';

const bot_token: string | undefined = process.env.bot_token;

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

    let json: string = JSON.stringify(new_data, null, 2);

    if (json.length > 100000) {
        if (new_data.params?.payload) {
            if (typeof new_data.params.payload === 'string') {
                new_data.params.payload = `truncated for size (showing first 1000 lines): ${new_data.params.payload.substring(
                    0,
                    100000
                )}`;
            } else {
                new_data.params.payload = 'truncated for size';
            }

            json = JSON.stringify(new_data, null, 2);
        } else if (new_data.out) {
            if (typeof new_data.out === 'string') {
                new_data.out = `truncated for size (showing first 1000 lines): ${new_data.out.substring(0, 100000)}`;
            } else {
                new_data.out = 'truncated for size';
            }

            json = JSON.stringify(new_data, null, 2);
        }
    }

    if (json.length > 100000) {
        json = `truncated for size: ${json.substring(0, 1000)}`;
    }

    const params: { [index: string]: any } = {
        channels: slack.debug.channel,
        content: json,
        title: title || 'Slack Backend Response',
        filetype: 'javascript',
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

    const response: any = await postMsgForm(options).catch(async (err: IAxiosError) => {
        err.trace = utils.addTrace(err.trace, '@at $slack.debug (slackMsg): postMsg');
        err.title = title;

        utils.logErr('$slack.debug (slackMsg): slack reply error', err);

        return Promise.resolve();
    });

    utils.logInfo(`$slack.debug (slackMsg): slack reply status: ${response}`);

    return Promise.resolve();
};
