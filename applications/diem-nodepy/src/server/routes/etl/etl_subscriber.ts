import { NatsConnection, Subscription } from 'nats';
import { NC, IPayload, fromBuff, toBuff } from '@config/nats_connect';
import { handler } from './etl.handler';

const queue: string = 'nodepy.*';

class Subscriber {
    private nc!: NatsConnection;
    private client!: number;
    private subscription!: Subscription;

    public connect = async () => {
        try {
            this.nc = NC.nc;
        } catch (err) {
            console.error('$nats_subscriber (publish): connect error:', err);

            return;
        }

        this.client = this.nc.info?.client_id || 0;
        this.subscription = this.nc.subscribe(queue);

        await this.handleSubscriptions();

        console.info(`$nats_subscriber (subscribe): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private handleSubscriptions = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            if (payload && typeof payload === 'object' && payload.id) {
                if (msg.reply) {
                    msg.respond(
                        toBuff({
                            client: this.client,
                            id: payload.id,
                        })
                    );
                    console.info(
                        `$request (cb): confirming message: id: ${payload.id} - client: ${payload.client} - client: ${msg.sid}`
                    );
                } else {
                    console.info(`$request (cb): new message: id: ${payload.id} - client: ${payload.client}`);
                }

                if (payload.data) {
                    await handler(payload.data);
                }
            }
        }
    };
}

export const etl_subscriber = new Subscriber();
