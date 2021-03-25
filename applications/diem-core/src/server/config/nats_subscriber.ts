import { Msg, NatsConnection, NatsError } from 'nats';
import { NC, IPayload, toBuf, fromBuf } from './nats_connect';

const queue: string = 'diem.*';

class Subscriber {
    private nc!: NatsConnection;
    private client!: number;

    public connect = async () => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            console.error('$nats_subscriber (connect): connect error:', err);

            return;
        }

        this.client = this.nc.info?.client_id || 0;

        this.nc.subscribe(queue, { callback: this.cb, queue });

        console.info(`$nats_subscriber (connect): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private cb = async (err: NatsError | null, msg: Msg) => {
        if (err) {
            return console.error(err);
        }

        const payload: IPayload = fromBuf(msg.data);

        if (msg.reply) {
            msg.respond(
                toBuf({
                    client: this.client,
                    id: payload.id,
                })
            );
            console.info(`$nats_subscriber (cb): confirming message: id: ${payload.id} - client: ${payload.client}`);
        } else {
            console.info(payload.data);

            console.info(`$nats_subscriber (cb): new message: id: ${payload.id} - client: ${payload.client}`);
        }
    };
}

export const subscriber = new Subscriber();
