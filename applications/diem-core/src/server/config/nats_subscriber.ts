import { utils } from '@common/utils';
import { INatsPayload } from '@interfaces';
import { NatsConnection, Subscription, ServerInfo } from 'nats';
import { NC, toBuff, fromBuff } from './nats_connect';
import { pubSub } from './pubsub';
import { WSS } from './socket';

const queue: string = 'core';
const core_channel: string = 'core.*';
const global_core_channel: string = 'global.core.*';

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private global_subscription!: Subscription;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-core';
    }

    public connect = async () => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            void utils.logError('$nats_subscriber (connect): connect error:', err);

            return;
        }

        if (this.nc.info) {
            this.info = this.nc.info;
            utils.logInfo(
                `$nats_subscriber (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
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
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (payload && typeof payload === 'object' && payload.client) {
                let msg_type: string;

                if (subject.includes('.')) {
                    msg_type = subject.split('.')[1];
                } else {
                    msg_type = subject;
                }

                if (msg_type === 'info') {
                    utils.logInfo(`$nats_subscriber (${msg_type}): client: ${payload.client} - data: ${payload.data}`);
                }

                if (msg_type === 'job') {
                    const data = payload.data;

                    if (data && typeof data === 'string' && data.endsWith('\n')) {
                        const json_array: string[] = data.split('\n').filter((s: string) => s);
                        utils.logInfo(
                            `$nats_subscriber (${msg_type}): client: ${payload.client} - incomming data - buffered: ${json_array.length}`
                        );
                        for await (const json of json_array) {
                            try {
                                await pubSub.publish(JSON.parse(json));
                            } catch (err) {
                                utils.logInfo('$nats_subscriber (subs): job - unrelated data');
                            }
                        }
                    } else {
                        utils.logInfo(`$nats_subscriber (${msg_type}): client: ${payload.client} - incomming data`);
                        await pubSub.publish(payload.data);
                    }
                }

                if (msg.reply) {
                    msg.respond(
                        toBuff({
                            client: this.client,
                            sid: msg.sid || 0,
                        })
                    );
                    utils.logInfo(`$$nats_subscriber (${msg_type}):  client: ${payload.client} - client: ${msg.sid}`);
                }

                if (!['error', 'info'].includes(msg_type)) {
                    utils.logInfo(`$nats_subscriber (${msg_type}): client: ${payload.client}`);
                }
            }
        }
    };

    private global_subs = async (): Promise<void> => {
        for await (const msg of this.global_subscription) {
            const payload: INatsPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (payload && typeof payload === 'object' && payload.client) {
                let msg_type: string;

                if (subject.includes('.')) {
                    msg_type = subject.split('.')[2]; // global.core.xxx
                } else {
                    msg_type = subject;
                }

                if (msg_type === 'info') {
                    utils.logInfo(
                        `$nats_subscriber (global-${msg_type}): client: ${payload.client} - data: ${payload.data}`
                    );
                }

                if (msg_type === 'error') {
                    utils.logInfo(`$nats_subscriber (global-${msg_type}): client: ${payload.client}`);

                    await pubSub.publish(payload.data);
                }

                if (msg_type === 'users') {
                    utils.logInfo(`$nats_subscriber (global-${msg_type}): client: ${payload.client}`);

                    WSS.bc(payload.data);
                }

                if (msg_type === 'user') {
                    utils.logInfo(`$nats_subscriber (global-${msg_type}): client: ${payload.client}`);

                    WSS.message(payload.data);
                }

                if (msg_type === 'client-payload') {
                    utils.logInfo(`$nats_subscriber (global-${msg_type}): client: ${payload.client}`);

                    WSS.bcClient(payload.data);
                }

                if (!['users', 'error', 'info'].includes(msg_type)) {
                    utils.logInfo(`$nats_subscriber (global-${msg_type}): client: ${payload.client}`);
                }
            }
        }
    };
}

export const subscriber = new Subscriber();
