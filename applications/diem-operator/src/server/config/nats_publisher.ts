import { utils } from '@config/utils';
import { createInbox, ErrorCode, NatsConnection, ServerInfo } from 'nats';
import { toBuff } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private inbox: string;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'operator';
        this.inbox = createInbox();
    }

    public connect = async (nc: NatsConnection): Promise<void> => {
        try {
            this.nc = nc;
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

    public publish = (channel: string, data: any) => {
        this.nc.publish(`core.${channel}`, toBuff({ client: this.client, data }));
    };

    public publish_global = (channel: string, event: any) => {
        const channel_name = `global.core.${channel}`;
        utils.logInfo(`$nats_publisher (publish_global): publishing : channel: ${channel_name}`);
        this.nc.publish(channel_name, toBuff({ client: this.client, data: event }));
    };

    public request = (channel: string, event: any) => {
        this.nc.publish(`core.${channel}`, toBuff({ client: this.client, data: event }), {
            reply: this.inbox,
        });
    };
}

export const publisher = new Publisher();
