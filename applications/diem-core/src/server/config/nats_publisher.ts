import { utils } from '@common/utils';
import { INatsPayload } from '@interfaces';
import { ErrorCode, NatsConnection, ServerInfo } from 'nats';
import { addTrace } from '@functions';
import { fromBuff, toBuff, INatsError } from './nats_connect';

class Publisher {
    private nc!: NatsConnection;
    private info!: ServerInfo;
    private client: string;

    public constructor() {
        this.client = process.env.HOSTNAME || 'diem-core';
    }

    public connect = async (nc: NatsConnection): Promise<boolean> => {
        try {
            this.nc = nc;
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

    public request = async (channel: string, data: any): Promise<INatsPayload | undefined> => {
        const hrstart: [number, number] = process.hrtime();

        utils.logInfo(`$nats_publisher (request): new request - channel: ${channel} client: ${this.client}`);

        try {
            const payload = toBuff({ client: this.client, data });
            const response: any = await this.nc
                .request(channel, payload, {
                    timeout: 10000,
                })
                .catch(async (err: INatsError) => {
                    switch (err.code) {
                        case ErrorCode.NoResponders:
                            err.trace = addTrace(err.trace, '@at $np.create (nodePyRequestJob) - no responders');
                            err.message = 'No Executor is available to handle your request';
                            break;
                        case ErrorCode.Timeout:
                            err.trace = addTrace(err.trace, '@at $np.create (nodePyRequestJob) - timeout');
                            err.message = 'Timeout handling your request';
                            break;
                        default:
                            err.trace = addTrace(err.trace, '@at $np.create (nodePyRequestJob) - other error');
                    }

                    // pass to the try catch handler below
                    return Promise.reject(err);
                });

            const response_data = fromBuff(response.data);
            if (response_data) {
                utils.logInfo(
                    `$nats_publisher (request): delivery confirmed - client: ${response_data.client}`,
                    undefined,
                    process.hrtime(hrstart)
                );

                return Promise.resolve(response_data);
            }

            return Promise.resolve(undefined);
        } catch (err) {
            //     utils.logInfo(`$nats_publisher (request): error: ${err.message}`);

            return Promise.reject(err);
        }
    };
}

export const publisher = new Publisher();
