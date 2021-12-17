import { NatsConnection, ServerInfo, Subscription } from 'nats';
import { fromBuff, toBuff } from '@config/nats_connect';
import { IError, IPayload } from '@interfaces';
import { utils } from '@config/utils';
import { addTrace } from '../shared/functions';
import { handler } from './services.handler';

const queue = 'nodepy';
const nodepy_channel = 'nodepy.services.*';

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-nodepy';
    }

    public connect = async (nc: NatsConnection) => {
        try {
            this.nc = nc;
        } catch (err) {
            console.error('$services_subscriber (publish): connect error:', err);

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

        utils.logInfo(`$services_subscriber (subscribe): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            if (payload && typeof payload === 'object' && payload.client) {
                const data = await handler(payload.data).catch(async (err: IError) => {
                    err.trace = addTrace(err.trace, '@at $services_subscriber (subs)');

                    data.error = err;

                    void utils.logError('$services_subscriber (subs): error', err);
                });

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
