import { NatsConnection, ServerInfo, Subscription } from 'nats';
import { NC, IPayload, fromBuff, toBuff } from '@config/nats_connect';
import { utils } from '@common/utils';
import { IntJob } from '@config/interfaces';
import { handler } from './etl.handler';
import { stopWorker } from './etl.workers';

const queue: string = 'nodepy';
const nodepy_channel: string = 'nodepy.job.*';
const global_nodepy_channel: string = 'global.nodepy.*';

class Subscriber {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private subscription!: Subscription;
    private global_subscription!: Subscription;
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
        this.global_subscription = this.nc.subscribe(global_nodepy_channel);

        void this.subs();
        void this.global_subs();

        utils.logInfo(`$nats_subscriber (subscribe): connected : client ${this.client}`);

        return Promise.resolve();
    };

    private subs = async () => {
        for await (const msg of this.subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            if (payload && typeof payload === 'object' && payload.client) {
                if (msg.reply) {
                    const confirmed: boolean = msg.respond(
                        toBuff({
                            client: this.client,
                        })
                    );
                    utils.logInfo(
                        `$etl_subscriber (${subject}): confirming message: - requester: ${payload.client} - confirmed: ${confirmed}`
                    );
                } else {
                    utils.logInfo(
                        `$etl_subscriber (${subject}): new message: requester: ${payload.client} - sid: ${msg.sid}`
                    );
                }

                if (payload.data) {
                    void handler(payload.data);
                }
            }
        }
    };

    private global_subs = async () => {
        for await (const msg of this.global_subscription) {
            const payload: IPayload | string | undefined = fromBuff(msg.data);
            const subject: string = msg.subject;

            if (payload && typeof payload === 'object' && payload.client) {
                if (msg.reply) {
                    const confirmed: boolean = msg.respond(
                        toBuff({
                            client: this.client,
                        })
                    );
                    utils.logInfo(
                        `$request (subs): confirming message: source: ${this.client} - target: ${payload.client} - confirmed: ${confirmed}`
                    );
                } else {
                    utils.logInfo(`$request (sub): new message: client: ${payload.client} - sid: ${msg.sid}`);
                }

                let msg_type: string;

                if (subject.includes('.')) {
                    msg_type = subject.split('.')[2]; // global.core.xxx
                } else {
                    msg_type = subject;
                }
                if (msg_type === 'stop') {
                    const job: IntJob = payload.data;
                    utils.logInfo(`$nats_subscriber (${subject}): client: ${payload.client} - id: ${job.id}`);

                    await stopWorker(payload.data).catch((err: any) => {
                        void utils.logError('pubsub (message)', err);
                    });
                }
            }
        }
    };
}

export const etl_subscriber = new Subscriber();
