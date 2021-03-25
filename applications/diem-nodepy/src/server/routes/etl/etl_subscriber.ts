import { Msg, NatsConnection, NatsError } from 'nats';
import { NC, IPayload, toBuf, fromBuf } from '../../config/nats_connect';
import { handler } from './etl.handler'

const queue: string = 'diem.nodepy'

class Subscriber {
    private nc!: NatsConnection;
    private client!: number;

    public connect = async () => {
        try {
            this.nc = NC.nc;
        } catch (err) {
            console.error('$nats_subscriber (publish): connect error:', err);

            return;
        }

        this.client = this.nc.info?.client_id || 0;
        await this.nc.subscribe(queue, { callback: this.cb, queue});

        console.info(`$nats_subscriber (subscribe): connected : client ${this.client}`);
        return Promise.resolve()
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
            const payload: IPayload = fromBuf(msg.data);
            await handler(payload.data)
            console.info(`$nats_subscriber (cb): new message: id: ${payload.id} - client: ${payload.client}`);
        }
    };
}

export const etl_subscriber = new Subscriber();
