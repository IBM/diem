import { utils } from '@common/utils';
import { ErrorCode, NatsConnection, ServerInfo } from 'nats';
import { NC, fromBuff, toBuff } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-core';
    }

    public connect = async (): Promise<boolean> => {
        try {
            this.nc = await NC.connect();
        } catch (err) {
            switch (err.code) {
                case ErrorCode.NoResponders:
                    utils.logInfo('$nats_publisher (connect): no service available');
                    break;
                case ErrorCode.Timeout:
                    utils.logInfo('$nats_publisher (connect): service did not respond');
                    break;
                default:
                    void utils.logError('$nats_publisher (connect): request error:', err);
            }

            return Promise.reject();
        }

        if (this.nc.info) {
            this.info = this.nc.info;
            utils.logInfo(
                `$nats_publisher (connect): connected : nsid ${this.info.client_id} - nsc ${this.info.client_ip}`
            );
        }

        return Promise.resolve(true);
    };

    public publish = async (channel: string, event: any) => {
        this.nc.publish(channel, toBuff({ client: this.client, data: event }));
    };

    public request = async (channel: string, event: any) => {
        const hrstart: [number, number] = process.hrtime();

        utils.logInfo(`$nats_publisher (request): new request : channel: ${channel} client: ${this.client}`);

        try {
            const payload = toBuff({ client: this.client, data: event });
            const m: any = await this.nc.request(channel, payload, {
                timeout: 1000,
            });

            const data = fromBuff(m.data);
            if (data) {
                utils.logInfo(
                    `$nats_publisher (request): delivery confirmed - client: ${data.client}`,
                    undefined,
                    process.hrtime(hrstart)
                );
            }

            return Promise.resolve();
        } catch (err) {
            utils.logInfo(`$nats_publisher (request): error: ${err.message}`);

            return Promise.reject(err);
        }
    };
}

export const publisher = new Publisher();
