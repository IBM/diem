import { utils } from '@common/utils';
import { INatsPayload } from '@interfaces';
import { NatsConnection, Subscription, ServerInfo, Msg } from 'nats';
import { slackMsg } from '@common/slack/slack';
import { toBuff, fromBuff } from './nats_connect';
import { pubSub } from './pubsub';
import { WSS } from './socket';
import { getQueue } from './cron.jobs';

const queue = 'core';
const core_channel = 'core.*';
const global_core_channel = 'global.core.*';

const json_handler = async (json_array: any) => {
    let i = -10;

    let out: any[] = [];
    let base: any;
    for await (const json of json_array) {
        let parsed_json: any;
        i = i + 10;

        try {
            parsed_json = JSON.parse(json);
            if (parsed_json.serviceid) {
                await pubSub.publishService(parsed_json);
            } else {
                // let's add a timeout so that the messages have sufficient time to be processed

                if (!base && parsed_json.out && !parsed_json.status) {
                    base = { ...parsed_json };
                    out.push(parsed_json.out);
                } else if (parsed_json.out && !parsed_json.status) {
                    out.push(parsed_json.out);
                }

                if (parsed_json.status) {
                    if (base) {
                        base.out = out.map((_out: any) => ({ out: _out }));
                        base.outl = true;
                        parsed_json = { ...parsed_json, ...base };
                        void pubSub.publish(parsed_json);

                        base = undefined;
                        out = [];
                    } else {
                        void pubSub.publish(parsed_json);
                    }
                }
            }
        } catch (err) {
            utils.logInfo('$nats_subscriber (subs): job - unparsable json');
        }
    }

    if (base) {
        base.out = out.map((_out: any) => ({ out: _out }));
        base.outl = true;
        void pubSub.publish(base);
        base = undefined;
        out = [];
    }
};

const global_subs_handler = async (msg: Msg, payload: INatsPayload) => {
    const subject: string = msg.subject;

    let msg_type: string;

    if (subject.includes('.')) {
        msg_type = subject.split('.')[2]; // global.core.xxx
    } else {
        msg_type = subject;
    }

    switch (msg_type) {
        case 'info':
            utils.logCyan(`$nats_subscriber (global.${msg_type}): client: ${payload.client} - data: ${payload.data}`);
            break;

        case 'error':
            utils.logCyan(`$nats_subscriber (global.${msg_type}): client: ${payload.client}`);

            void pubSub.publish(payload.data);
            break;

        case 'users':
            utils.logCyan(`$nats_subscriber (global.${msg_type}): client: ${payload.client}`);

            WSS.bc(payload.data);
            break;

        case 'user':
            utils.logCyan(`$nats_subscriber (global.${msg_type}): client: ${payload.client}`);

            const data: { email: string; payload: string } = payload.data;

            WSS.bcUser({ email: data.email, payload: data.payload });
            break;

        default:
            utils.logCyan(`$nats_subscriber (global.${msg_type}): client: ${payload.client}`);
    }
};

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private global_subscription!: Subscription;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-core';
    }

    public connect = async (nc: NatsConnection) => {
        try {
            this.nc = nc;
        } catch (err) {
            void utils.logError('$nats_subscriber (connect): connect error:', err);

            return;
        }

        if (this.nc.info) {
            this.info = this.nc.info;
            utils.logInfo(
                `$nats_subscriber (connect): connected - nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        this.subscription = this.nc.subscribe(core_channel, { queue });
        this.global_subscription = this.nc.subscribe(global_core_channel);

        void this.subs();
        void this.global_subs();

        return Promise.resolve();
    };

    private subs = async (): Promise<void> => {
        for await (const msg of this.subscription) {
            const payload: INatsPayload | string | undefined = fromBuff(msg.data);

            if (payload && typeof payload === 'object' && payload.client) {
                utils.logCyan(
                    `$nats_subscriber (sub): client: ${payload.client} - new data: ${payload.meta?.size || 0}`
                );
                void this.subs_handler(msg, payload);
                if (payload.meta && payload.meta.size === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 25, null));
                }
            }
        }
    };

    private global_subs = async (): Promise<void> => {
        for await (const msg of this.global_subscription) {
            const payload: INatsPayload | string | undefined = fromBuff(msg.data);

            // if it's not the payload we need, we cannot handle it
            if (payload && typeof payload === 'object' && payload.client) {
                void global_subs_handler(msg, payload);
            }
        }
    };

    private subs_handler = async (msg: Msg, payload: INatsPayload) => {
        const subject: string = msg.subject;

        // if it's not the payload we need, we cannot handle it

        let msg_type: string;

        if (subject.includes('.')) {
            msg_type = subject.split('.')[1];
        } else {
            msg_type = subject;
        }

        switch (msg_type) {
            case 'info':
                utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client} - info: ${payload.data}`);
                break;

            case 'publish':
                utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client}`);
                const publish_msg = `📨 $publish (${payload.client}): ${payload.data}`;

                void slackMsg(publish_msg);
                break;

            case 'timer':
                utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client} - run: ${payload.data.run}`);
                getQueue();
                break;

            case 'job':
                const data = payload.data;

                if (data && typeof data === 'string' && data.endsWith('\n')) {
                    const json_array: string[] = data.split('\n').filter((s: string) => s);
                    utils.logCyan(
                        `$nats_subscriber (${msg_type}): client: ${payload.client} - incoming buffered data: ${json_array.length}`
                    );
                    // await new Promise((resolve) => setTimeout(resolve, 50));
                    await json_handler(json_array);
                } else {
                    utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client} - incoming data`);
                    void pubSub.publish(payload.data);
                }
                break;

            default:
                utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client}`);
        }

        if (msg.reply) {
            msg.respond(
                toBuff({
                    client: this.client,
                    sid: msg.sid || 0,
                })
            );
            utils.logCyan(`$$nats_subscriber (${msg_type}):  client: ${payload.client} - client: ${msg.sid}`);
        }

        if (!['timer', 'info', 'job'].includes(msg_type)) {
            utils.logCyan(`$nats_subscriber (${msg_type}): client: ${payload.client}`);
        }
    };
}

export const subscriber = new Subscriber();
