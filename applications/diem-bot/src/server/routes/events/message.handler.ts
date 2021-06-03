import { utils } from '@common/utils';
import { parse } from 'yaml';
import { IArgsBody, EComponents } from '@interfaces';
import { api, thisbot } from '../routes';
import { serviceHandler } from './service.handler';
import { payloads } from './home.handler';

const argsParser: (event: any) => IArgsBody = (event: any): IArgsBody => {
    const message = event.text.replace(thisbot.key, '').replaceAll('\n', ' ');

    const args = message.split(' ').map((item: string) => item.toLowerCase().trim());

    let component: EComponents;
    let action: string; // args[2]
    let id: string; // args[1]
    let params: { [index: string]: any } | undefined; // args[4]
    let payload: { [index: string]: any } | string | undefined; // args[3]

    component = args[0];
    id = args[1];
    action = args[2];
    payload = args[3];

    if (event.blocks) {
        const code_base = event.blocks[0].elements.find((el: any) => el.type === 'rich_text_preformatted');
        if (code_base) {
            const params_tmp: string = code_base.elements[0].text;

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
        },
    };
};

export const getProfile = async (event: any): Promise<any> => {
    const profile_resp = await api.callAPIMethodGet('users.profile.get', {
        user: event.user,
    });

    return profile_resp.profile;
};

export const messageHandler = async (event: any): Promise<any> => {
    if (event.subtype) {
        utils.logInfo(`$event.message (messageHandler): not handled message: ${event.subtype}`);

        return;
    }

    console.info('event', event);

    const body = argsParser(event);

    //console.info('body', body);

    if (!body.component) {
        return void otherMethod(event, body);
    }

    if (components[body.component]) {
        utils.logInfo(`$event.message (messageHandler): component: ${body.id}`);
        components[body.component](event, body);

        return;
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

const components: Record<string, any> = {
    help: helpMethod,
    service: serviceHandler,
};
