import { utils } from '@common/utils';
import { NatsConnection, Subscription, ServerInfo } from 'nats';
import { NC, IPayload, toBuff, fromBuff } from './nats_connect';

const queue: string = 'diem.*';

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private client: string;

    public constructor() {
        this.client = utils.Env.client;
    }

    public connect = async () => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            console.error('$nats_subscriber (connect): connect error:', err);

            return;
        }

        if (this.nc.info) {
            this.info = this.nc.info;
            console.info(
                `$nats_subscriber (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        this.subscription = this.nc.subscribe(queue, { queue });

        void this.subs();

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (!payload || typeof payload !== 'object' || !payload.client) {
                return console.info(`$nats_subscriber (subs): unknown message: ${subject}`);
            }

            let channel: string;

            if (subject.includes('.')) {
                channel = subject.split('.')[1];
            } else {
                channel = subject;
            }

            if (channel === 'info') {
                return console.info(`$nats_subscriber (${channel}): client: ${payload.client} - info: ${payload.data}`);
            }

            if (msg.reply) {
                msg.respond(
                    toBuff({
                        client: this.client,
                        sid: msg.sid || 0,
                    })
                );
                console.info(`$$nats_subscriber (${channel}):  client: ${payload.client} - client: ${msg.sid}`);

                return;
            }
            console.info(`$$nats_subscriber (${channel}): client: ${payload.client}`);
        }
    };
}

export const subscriber = new Subscriber();
