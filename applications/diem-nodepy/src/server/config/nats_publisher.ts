import { createInbox, ErrorCode, NatsConnection, ServerInfo } from 'nats';
import { NC, toBuff } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private inbox: string;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'nodepy';
        this.inbox = createInbox();

        console.info(`$nats_publisher (publish): created inbox ${this.inbox}`);
    }

    public connect = async (): Promise<boolean> => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            switch (err.code) {
                case ErrorCode.NoResponders:
                    console.info('$nats_publisher (publish): no service available');
                    break;
                case ErrorCode.Timeout:
                    console.info('$nats_publisher (publish): service did not respond');
                    break;
                default:
                    console.error('$nats_publisher (publish): request error:', err);
            }

            return Promise.reject();
        }
        if (this.nc.info) {
            this.info = this.nc.info;
            console.info(
                `$nats_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        return Promise.resolve(true);
    };

    public publish = async (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuff({ client: this.client, data: event }));
    };

    public request = async (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuff({ client: this.client, data: event }), {
            reply: this.inbox,
        });
    };
}

export const publisher = new Publisher();
