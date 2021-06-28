/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 *
 * @module slack
 */

import { ISlack, utils } from '../utils';
import { postMsg, IAxiosError, AxiosRequestConfig } from './axios';

export const slackDebug: (title: string, data: any) => Promise<void> = async (
    title: string,
    data: any
): Promise<void> => {
    const slack: ISlack = utils.slack;

    if (!slack.url || !slack || !slack.deploy || !slack.debug.channel) {
        utils.logInfo(`$slack (slackMsg): no deploy channel on ${utils.Env.K8_SYSTEM_NAME}`);

        return;
    }

    const options: AxiosRequestConfig = {
        data: {
            channel: slack.debug.channel,
            // eslint-disable-next-line camelcase
            icon_emoji: slack.emoji,
            username: `${slack.debug.username} on ${utils.Env.K8_SYSTEM_NAME}`,
        },
        method: 'POST',
        url: slack.url,
    };

    options.data.blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
            },
        },
    ];
    options.data.text = title || 'Slack Backend Response';

    if (!process.env.disableslack) {
        const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '@at $slack (slackMsg)');

            return utils.logError('$slack (slackMsg)', err);
        });

        utils.logInfo(`$slack (slackMsg): status: ${response}`);
    } else {
        utils.logErr('$slack (slackMsg): slack disabled');
    }
};
