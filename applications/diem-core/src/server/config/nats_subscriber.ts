import { NatsConnection, Subscription } from 'nats';
import { NC, IPayload, toBuff, fromBuff } from './nats_connect';

const queue: string = 'diem.*';

class Subscriber {
    private nc!: NatsConnection;
    private client!: number;
    private subscription!: Subscription;

    public connect = async () => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            console.error('$nats_subscriber (connect): connect error:', err);

            return;
        }

        this.client = this.nc.info?.client_id || 0;

        this.subscription = this.nc.subscribe(queue, { queue });

        void this.subs();

        console.info(`$nats_subscriber (connect): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            // if it's not the payload we need, we cannot handle it
            if (!payload || typeof payload !== 'object' || !payload.id) {
                return console.info(`$nats_subscriber (subs): unknown message: ${subject}`);
            }

            let channel: string;

            if (subject.includes('.')) {
                channel = subject.split('.')[1];
            } else {
                channel = subject;
            }

            if (channel === 'info') {
                return console.info(
                    `$nats_subscriber (${channel}): id: ${payload.id} - client: ${payload.client} - info: ${payload.data}`
                );
            }

            if (msg.reply) {
                msg.respond(
                    toBuff({
                        client: this.client,
                        id: payload.id,
                    })
                );
                console.info(
                    `$$nats_subscriber (${channel}): id: ${payload.id} - client: ${payload.client} - client: ${msg.sid}`
                );

                return;
            }
            console.info(`$$nats_subscriber (${channel}): id: ${payload.id} - client: ${payload.client}`);
        }
    };
}

export const subscriber = new Subscriber();
