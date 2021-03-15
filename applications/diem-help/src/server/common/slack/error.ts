/***
 * @module slack-error
 * Messages from the user
 */

import { IRequest } from '../../interfaces/shared';
import { ISlack, utils } from '../utils';
import { postMsg, IAxiosError, AxiosRequestConfig } from './axios';

export const slackMsgError: (req: IRequest, slackConfig?: Partial<ISlack>) => Promise<any> = async (
    req: any,
    slackConfig?: Partial<ISlack>
): Promise<any> => {
    const slack: ISlack = slackConfig ? { ...utils.slack, ...slackConfig } : utils.slack;
    if (!slack.url || !slack || !slack.internal || !slack.internal.channel) {
        utils.logInfo(`$error (slackMsgError): no internal channel on ${utils.Env.K8_SYSTEM_NAME}`);

        return Promise.resolve();
    }

    const body: IRequest['body'] = { ...req.body };
    body.transid = req.transid;

    const error: string = body.msg;

    const transid: string = req.transid || body.transid || utils.guid();

    const sl: string = JSON.stringify(
        {
            email: 'anonymous',
            error,
            transid,
        },
        undefined,
        2
    );

    const options: AxiosRequestConfig = {
        data: {
            channel: slack.internal.channel,
            // eslint-disable-next-line camelcase
            icon_emoji: slack.emoji,
            text: sl,
            username: `${slack.internal.username} on ${utils.Env.K8_SYSTEM_NAME}`,
        },
        method: 'POST',
        url: slack.url,
    };

    if (!process.env.disableslack) {
        const response: any = await postMsg(options).catch(async (err: IAxiosError) => {
            err.trace = utils.addTrace(err.trace, '@at $error (slackMsgError)');

            await utils.logError('$error (slackrMsgErro)', err);

            return Promise.resolve('Something went wrong posting to slack');
        });

        utils.logInfo(`$error (slackrMsgErro): caller: external - transid: ${body.transid} - status: ${response}`);

        return Promise.resolve({ status: 200 });
    } else {
        return Promise.resolve({ status: '$error.error: $slack: disabledslack - caller: external' });
    }
};
