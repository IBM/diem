import { utils } from '@common/utils';
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
    }

    public connect = async (): Promise<void> => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            switch (err.code) {
                case ErrorCode.NoResponders:
                    utils.logInfo('$nats_publisher (publish): no service available');
                    break;
                case ErrorCode.Timeout:
                    utils.logInfo('$nats_publisher (publish): service did not respond');
                    break;
                default:
                    console.error('$nats_publisher (publish): request error:', err);
            }

            return Promise.reject();
        }
        if (this.nc.info) {
            this.info = this.nc.info;
            utils.logInfo(
                `$nats_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        return Promise.resolve();
    };

    public publish = (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuff({ client: this.client, data: event }));
    };

    public publish_global = (channel: string, event: any) => {
        utils.logInfo(`$nats_publisher (publish_global): publishing : channel: global.${channel}`);
        this.nc.publish(`diem.${channel}`, toBuff({ client: this.client, data: event }));
    };

    public request = (channel: string, event: any) => {
        this.nc.publish(`diem.${channel}`, toBuff({ client: this.client, data: event }), {
            reply: this.inbox,
        });
    };
}

export const publisher = new Publisher();
