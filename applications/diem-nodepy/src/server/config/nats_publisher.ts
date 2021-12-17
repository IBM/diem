import { utils } from '@config/utils';
import { createInbox, ErrorCode, NatsConnection, ServerInfo } from 'nats';
import { IMeta } from '@interfaces';
import { toBuff } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private inbox: string;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'nodepy';
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
                `$nats_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip} - max payload: ${this.info.max_payload}`
            );
        }

        return Promise.resolve();
    };

    public publish = (
        channel: string,
        id: string,
        event: any,
        meta: IMeta = { cycle: 0, size: 0, ts: 0, acc_size: 0, acc_ts: 0, s_ts: 0 }
    ) => {
        try {
            /* this is some code to ensure the maximum payload is not exceeded
             * In that case we sent a message giving the exceeded payload
             */
            if (event.length && this.info.max_payload && event.length > this.info.max_payload) {
                event = {
                    id,
                    jobid: id,
                    out: `maximum payload of ${this.info.max_payload} exceeded - payload: ${event.length}`,
                };
            }
            this.nc.publish(`core.${channel}`, toBuff({ client: this.client, data: event, meta }));
        } catch (err) {
            if (err.code && err.code === ErrorCode.MaxPayloadExceeded) {
                utils.logInfo(
                    `$nats_publisher (publish): max payload of ${this.info.max_payload} exceeded - payload: ${event.length}`
                );
            } else {
                utils.logInfo(`$nats_publisher (publish): error:`, err);
            }
        }
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
