import { NatsConnection, ServerInfo, Subscription } from 'nats';
import { NC, IPayload, fromBuff, toBuff } from '@config/nats_connect';
import { handler } from './etl.handler';

const queue: string = 'nodepy.*';

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-nodepy';
    }

    public connect = async () => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            console.error('$nats_subscriber (publish): connect error:', err);

            return;
        }

        if (this.nc.info) {
            this.info = this.nc.info;
            console.info(
                `$etl_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        this.subscription = this.nc.subscribe(queue);

        void this.subs();

        console.info(`$nats_subscriber (subscribe): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            if (payload && typeof payload === 'object' && payload.client) {
                if (msg.reply) {
                    msg.respond(
                        toBuff({
                            client: this.client,
                            sid: msg.sid || 0,
                        })
                    );
                    console.info(
                        `$request (cb): confirming message: client: ${payload.client} - sid: ${msg.sid}`
                    );
                } else {
                    console.info(`$request (cb): new message: client: ${payload.client} - sid: ${msg.sid}`);
                }

                if (payload.data) {
                    await handler(payload.data);
                }
            }
        }
    };
}

export const etl_subscriber = new Subscriber();
