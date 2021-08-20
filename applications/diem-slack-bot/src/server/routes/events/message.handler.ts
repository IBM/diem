import { utils } from '@common/utils';
import { parse } from 'yaml';
import { IArgsBody, EComponents, IError } from '@interfaces';
import { slackDebug } from '@common/slack/slack.debug';
import { api, thisbot } from '../routes';
import { reloadServiceDoc, services } from '../service.doc';
import { serviceHandler } from './service.handler';
import { payloads } from './home.handler';

const argsParser: (event: any) => IArgsBody = (event: any): IArgsBody => {
    //const message = event.text.replace(thisbot.key, '').replaceAll('\n', ' ');
    const message = event.text.replace(thisbot.key, '').split('\n')[0];

    const args_array = message.split(' ').map((item: string) => item.toLowerCase().trim());

    let component: EComponents;
    let action: string; // args_array[2]
    let id: string; // args_array[1]
    let params: { [index: string]: any } | undefined; // args_array[4]
    let payload: { [index: string]: any } | string | undefined; // args_array[3]
    let args: [string] | [] = [];

    component = args_array[0];
    id = args_array[1];
    action = args_array[2];
    args = args_array.slice(3);

    if (services) {
        for (const service of services) {
            if (service.name === id) {
                id = service.id;
                action = args_array[1];
                args = args_array.slice(2);
            }
        }
    }

    if (event.blocks) {
        const code_base = event.blocks[0].elements.find((el: any) => el.type === 'rich_text_preformatted');
        if (code_base) {
            const params_tmp: string = code_base.elements[0].text || code_base.elements[0].url;

            payload = params_tmp;

            try {
                params = parse(params_tmp);
                if (params?.payload) {
                    payload = params.payload;
                }
                if (params?.action) {
                    action = params.action;
                }
                if (params?.id) {
                    id = params.id;
                }

                if (params?.job) {
                    payload = params;
                }
                if (params?.service) {
                    component = EComponents.service;
                    id = params?.service;
                }
            } catch (err) {
                payload = params_tmp;
            }
        }
    }

    return {
        component,
        id,
        params: {
            action,
            component,
            id,
            payload,
            event,
            user: event.user,
            args,
        },
    };
};

const fileParser: (event: any, body: IArgsBody) => any = async (event: any, body: IArgsBody): Promise<IArgsBody> => {
    //const message = event.text.replace(thisbot.key, '').replaceAll('\n', ' ');

    const file_share: any = event.files[0];

    //id = file_share.title;
    body.params.payload = file_share.preview;

    if (file_share.url_private) {
        utils.logInfo('$message.handler (fileParser): looking up data');
        body.params.payload = file_share.url_private;
    }

    return Promise.resolve(body);
};

export const getProfile = async (event: any): Promise<any> => {
    const profile_resp = await api.callAPIMethodGet('users.profile.get', {
        user: event.user,
    });

    return profile_resp.profile;
};

export const messageHandler: (event: any) => Promise<boolean | any> = async (event: any): Promise<boolean | any> => {
    let body: any;
    if (event.subtype === 'file_share' && thisbot.key.includes(event.user)) {
        utils.logInfo(`$message.handler (messageHandler): excluding files posted by bot: ${event.user}`);

        return Promise.resolve(null);
    } else if (event.subtype === 'file_share') {
        body = argsParser(event);
        body = await fileParser(event, body);
    } else if (event.subtype) {
        utils.logInfo(`$message.handler (messageHandler): not handled message: ${event.subtype}`);

        return Promise.resolve(null);
    } else {
        body = argsParser(event);
    }

    // void slackDebug({ 'event logger:', event);

    if (body.id === 'reloadservicedoc') {
        void reloadServiceDoc();

        void replyMethod(event, body, 'Servicedoc reload completed');

        return Promise.resolve(null);
    }

    if (components[body.component] && body.component in components) {
        utils.logInfo(`$message.handler (messageHandler): component: ${body.component} - service: ${body.id}`);

        void slackDebug('$message.handler (messageHandler): parameters', body);

        const response: boolean | any = await components[body.component](event, body).catch(async (err: IError) => {
            err.trace = utils.addTrace(err.trace, '@at $message.handler (messageHandler) - components');

            void replyMethod(
                event,
                body,
                'Sorry, but an error happened',
                `Sorry, but an error happened\nReason of there error: ${err.err}`
            );

            return Promise.reject(err);
        });

        return Promise.resolve(response);
    } else {
        await otherMethod(event, body);

        return Promise.resolve(null);
    }
};

const helpMethod = async (event: any, _args: string[]): Promise<any> => {
    await api.callAPIMethodPost(
        'chat.postMessage',
        payloads.help_message({
            thread_ts: event.thread_ts ? event.thread_ts : event.event_ts,
            channel: event.channel,
        })
    );
};

const otherMethod = async (event: any, body: IArgsBody): Promise<any> => {
    await api.callAPIMethodPost(
        'chat.postMessage',

        {
            thread_ts: event.thread_ts ? event.thread_ts : event.event_ts,
            channel: event.channel,
            text: ':questions123: Sorry, but this is a command i do not understand, try: @Diem Bot help',
        }
    );

    utils.logInfo(`$event.handler (handleMessages): Invalid method called - method: ${body.id} - user: ${event.user}`);
};

// reply method can be used to reply to an incoming message
export const replyMethod = async (event: any, body: IArgsBody, text: string, data: string = text): Promise<any> => {
    await api.callAPIMethodPost(
        'chat.postMessage',

        {
            thread_ts: event.thread_ts ? event.thread_ts : event.event_ts,
            channel: event.channel,
            text,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `\`\`\`${data}\`\`\``,
                    },
                },
            ],
        }
    );

    utils.logInfo(`$event.handler (handleMessages): Invalid method called - method: ${body.id} - user: ${event.user}`);
};

const components: Record<string, any> = {
    help: helpMethod,
    service: serviceHandler,
};
