/* eslint-disable camelcase */
/***
 * @module slack-error-int
 */

import { IError } from '@interfaces';
import { ISlack, utils } from '../utils';
import { postMsg, IAxiosError, AxiosRequestConfig } from './axios';

const makeBlocks: (err: any) => any = (err: any) => {
    const fields: any[] = [];
    Object.keys(err).forEach((key: string) => {
        if (key === 'message') {
            return;
        }
        if (Array.isArray(err[key])) {
            fields.push({
                title: key,
                value: JSON.stringify(err[key], undefined, 2),
                short: false,
            });
        } else {
            fields.push({
                value: `*${key}:* ${err[key]}`,
                short: false,
            });
        }
    });

    const footer = `${utils.Env.K8_SYSTEM_NAME} - ${utils.Env.packname}@${utils.Env.version} - ${process.version}`;

    return {
        attachments: [
            {
                pretext: `:heavy_exclamation_mark: Error: ${err.message || 'An Error has been reported'}`,
                mrkdwn_in: ['text', 'value', 'pretext'],
                color: '#e71d32',
                fields,
                footer,
            },
        ],
    };
};

export const slackMsgInt: (error: IError, slackConfig?: Partial<ISlack>) => Promise<void> = async (
    error: IError,
    slackConfig?: Partial<ISlack>
): Promise<void> => {
    const slack: ISlack = slackConfig ? { ...utils.slack, ...slackConfig } : utils.slack;
    /** sending to slack */

    if (!slack.url || !slack || !slack.internal || !slack.internal.channel) {
        utils.logInfo(`$slack (slackMsg): no internal channel on ${utils.Env.K8_SYSTEM_NAME}`);

        return;
    }

    const sl: string | any = error.blocks ? error : makeBlocks(error);

    const options: AxiosRequestConfig = {
        data: {
            channel: slack.internal.channel,
            // eslint-disable-next-line camelcase
            icon_emoji: slack.emoji,
            username: `${slack.internal.username} on ${utils.Env.K8_SYSTEM_NAME}`,
        },
        method: 'POST',
        url: slack.url,
    };

    if (error.blocks) {
        options.data.blocks = sl;
    } else if (sl.attachments) {
        options.data.attachments = sl.attachments;
    } else {
        options.data.text = sl;
    }

    if (!process.env.disableslack) {
        const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '$error-int (slackMsgInt)');

            return utils.logError('$error-int (slackMsgInt)', err);
        });

        utils.logInfo(
            `$error-int (slackMsgInt): - caller: ${error.caller || 'n/a'} - transid: ${
                error.transid
            } - status: ${response}`
        );
    } else {
        utils.logErr(`$error-int: disabledslack - caller: ${error.caller || 'n/a'}`);
    }
};
