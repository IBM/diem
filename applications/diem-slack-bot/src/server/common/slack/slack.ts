/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 *
 * @module slack
 */

import { ISlack, utils } from '../utils';
import { postMsg, IAxiosError, AxiosRequestConfig } from './axios';

/** sending to slack */

interface IntSlackMsg {
    blocks: any;
    attachments: any;
}

const getOptions: (m: any) => any = (m: any) => {
    let sl: string | IntSlackMsg;

    if (m.blocks) {
        sl = m;
    } else if (typeof m === 'object') {
        try {
            sl = JSON.stringify(m, undefined, 2);
        } catch (err) {
            sl = m;
        }
    } else {
        sl = m;
    }

    return sl;
};

export const slackMsg: (m: any, slackConfig?: Partial<ISlack>) => Promise<void> = async (
    m: any,
    slackConfig?: Partial<ISlack>
): Promise<void> => {
    const slack: ISlack = slackConfig ? { ...utils.slack, ...slackConfig } : utils.slack;

    if (!slack.url || !slack || !slack.deploy || !slack.deploy.channel) {
        utils.logInfo(`$slack (slackMsg): no deploy channel on ${utils.Env.K8_SYSTEM_NAME}`);

        return;
    }

    const sl: string | IntSlackMsg = getOptions(m);

    const options: AxiosRequestConfig = {
        data: {
            channel: slack.deploy.channel,
            // eslint-disable-next-line camelcase
            icon_emoji: slack.emoji,
            username: `${slack.deploy.username} on ${utils.Env.K8_SYSTEM_NAME}`,
        },
        method: 'POST',
        url: slack.url,
    };

    if (m.blocks) {
        options.data.blocks = m.blocks;
    } else if (m.attachments) {
        options.data.attachments = m.attachments;
    } else {
        options.data.text = sl;
    }

    if (!process.env.disableslack) {
        const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '@at $slack (slackMsg)');

            return utils.logError('$slack (slackMsg)', err);
        });

        utils.logInfo(`$slack (slackMsg): caller: ${m.caller || 'n/a'} - status: ${response}`);
    } else {
        utils.logErr(`$slack: disabledslack - caller: ${m.caller || 'n/a'}`);
    }
};
