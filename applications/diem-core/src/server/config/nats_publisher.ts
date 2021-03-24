import { createInbox, ErrorCode, NatsConnection } from 'nats';
import { NC, toBuf } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private client!: number;

    private inbox: string;

    public constructor() {
        this.inbox = createInbox();
        console.info(`$nats_publisher (publish): created inbox ${this.inbox}`);
    }

    public connect = async (): Promise<boolean> => {
        try {
            this.nc = NC.nc;
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
        this.client = this.nc.info?.client_id || 0;
        console.info(`$nats_publisher (connect): connected : client ${this.client}`);

        return Promise.resolve(true);
    };

    public publish = async (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuf({ id: 'pl', client: this.client, payload: event }), {
            reply: this.inbox,
        });
    };
}

export const publisher = new Publisher();
