import { createInbox, ErrorCode, NatsConnection, JSONCodec } from 'nats';
import { NC, toBuff } from './nats_connect';

const jc = JSONCodec();

class Publisher {
    private nc!: NatsConnection;
    private client!: number;

    private inbox: string;

    public constructor() {
        this.inbox = createInbox();
        console.info(`$nats_publisher (connect): created inbox ${this.inbox}`);
    }

    public connect = async (): Promise<boolean> => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            switch (err.code) {
                case ErrorCode.NoResponders:
                    console.info('$nats_publisher (connect): no service available');
                    break;
                case ErrorCode.Timeout:
                    console.info('$nats_publisher (connect): service did not respond');
                    break;
                default:
                    console.error('$nats_publisher (connect): request error:', err);
            }

            return Promise.reject();
        }
        this.client = this.nc.info?.client_id || 0;
        console.info(`$nats_publisher (connect): connected : client ${this.client}`);

        return Promise.resolve(true);
    };

    public publish = async (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuff({ id: 'pl', client: this.client, payload: event }));
    };

    public request = async (channel: string, event: any) => {
        await this.nc
            .request(channel, jc.encode({ id: 'pl', client: this.client, payload: event }), {
                timeout: 1000,
            })
            .then((m) => {
                console.info(`got response: ${jc.decode(m.data)}`);
            })
            .catch(async (err) => {
                console.info(`problem with request: ${err.message}`);

                return Promise.reject(err);
            });

        return Promise.resolve();
    };
}

export const publisher = new Publisher();
