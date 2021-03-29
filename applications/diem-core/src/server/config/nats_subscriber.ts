import { utils } from '@common/utils';
import { NatsConnection, Subscription, ServerInfo } from 'nats';
import { NC, IPayload, toBuff, fromBuff } from './nats_connect';
import { pubSub } from './pubsub';
import { WSS } from './socket';

const queue: string = 'diem.*';
const global_queue: string = 'global.*';

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

        this.subscription = this.nc.subscribe(queue, { queue });
        this.global_subscription = this.nc.subscribe(global_queue);

        void this.subs();
        void this.global_subs();

        return Promise.resolve();
    };

    private subs = async (): Promise<void> => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (payload && typeof payload === 'object' && payload.client) {
                let channel: string;

                if (subject.includes('.')) {
                    channel = subject.split('.')[1];
                } else {
                    channel = subject;
                }

                if (channel === 'info') {
                    utils.logInfo(`$nats_subscriber (${channel}): client: ${payload.client} - data: ${payload.data}`);
                }

                if (channel === 'job') {
                    utils.logInfo(`$nats_subscriber (${channel}): client: ${payload.client} - data: ${payload.data}`);

                    await pubSub.publish(payload.data);
                }

                if (msg.reply) {
                    msg.respond(
                        toBuff({
                            client: this.client,
                            sid: msg.sid || 0,
                        })
                    );
                    utils.logInfo(`$$nats_subscriber (${channel}):  client: ${payload.client} - client: ${msg.sid}`);
                }

                if (!['error', 'info'].includes(channel)) {
                    utils.logInfo(`$nats_subscriber (${channel}): client: ${payload.client}`);
                }
            }
        }
    };

    private global_subs = async (): Promise<void> => {
        for await (const msg of this.global_subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (payload && typeof payload === 'object' && payload.client) {
                let channel: string;

                if (subject.includes('.')) {
                    channel = subject.split('.')[1];
                } else {
                    channel = subject;
                }

                if (channel === 'info') {
                    utils.logInfo(
                        `$nats_subscriber (global-${channel}): client: ${payload.client} - data: ${payload.data}`
                    );
                }

                if (channel === 'error') {
                    utils.logInfo(`$nats_subscriber (global-${channel}): client: ${payload.client}`);

                    await pubSub.publish(payload.data);
                }

                if (channel === 'users') {
                    utils.logInfo(`$nats_subscriber (global-${channel}): client: ${payload.client}`);

                    WSS.bc(payload.data);
                }

                if (channel === 'client') {
                    utils.logInfo(`$nats_subscriber (global-${channel}): client: ${payload.client}`);

                    WSS.message(payload.data);
                }

                if (channel === 'client-payload') {
                    utils.logInfo(`$nats_subscriber (global-${channel}): client: ${payload.client}`);

                    WSS.bcClient(payload.data);
                }

                if (!['users', 'error', 'info'].includes(channel)) {
                    utils.logInfo(`$nats_subscriber (global-${channel}): client: ${payload.client}`);
                }
            }
        }
    };
}

export const subscriber = new Subscriber();
