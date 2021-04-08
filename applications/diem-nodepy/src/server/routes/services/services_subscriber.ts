import { NatsConnection, ServerInfo, Subscription } from 'nats';
import { NC, IPayload, fromBuff, toBuff } from '@config/nats_connect';
import { utils } from '@config/utils';
import { handler } from './services.handler';

const queue: string = 'nodepy';
const nodepy_channel: string = 'nodepy.services.*';

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
            utils.logInfo(
                `$etl_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        this.subscription = this.nc.subscribe(nodepy_channel, { queue });

        void this.subs();

        utils.logInfo(`$nats_subscriber (subscribe): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            if (payload && typeof payload === 'object' && payload.client) {
                const data = await handler(payload.data);
                const confirmed: boolean = msg.respond(
                    toBuff({
                        client: this.client,
                        data,
                    })
                );
                utils.logInfo(
                    `$etl_subscriber (${subject}): confirming service: - requester: ${payload.client} - confirmed: ${confirmed}`
                );
            }
        }
    };
}

export const services_subscriber = new Subscriber();
