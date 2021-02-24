import { Channel, connect, Connection } from 'amqplib';
import { IntMQLog, IntMQLogBase, IntMQMailBase } from '../interfaces/mq';
import { IntInternal } from '../interfaces/shared';
import { utils } from './utils';
import { Credentials } from './cfenv';

export { IntMQLog, IntMQLogBase, IntMQMailBase };

const source: string = '@leap-common/$rabbitmq';

/**
 * Shortest name:  {@link RabbitMQ}
 * Full name:      {@link (RabbitMQ:class)}
 */

class RabbitMQ {
    public channel?: Channel;

    private exchange: string = 'topics';
    private mqurl!: string;
    private operational: boolean = false;
    private retries: number = 0;

    private credentials: any = Credentials('rabbitmq');

    public constructor() {
        if (!this.credentials || !this.credentials.url) {
            utils.logInfo('$rabbitmq (connect): No Url found - We cannot proceed');

            const internal: IntInternal = {
                source: '$rabbitmq',
                err: {
                    name: 'rabbitmq Connection',
                    message: 'Rabbit: No Url found - We cannot proceed',
                },
                message: 'rabbitmq Connection Error',
                fatal: true,
                pid: process.pid,
                trace: ['@at $rabbitmq (constructor'],
            };

            utils.emit('internal', internal);

            return;
        }

        this.mqurl = this.credentials.url;

        this.connect();
    }

    public connect = () => {
        let options: Record<string, unknown> = {};

        if (this.credentials.ca) {
            const caCert: Buffer = Buffer.from(this.credentials.ca, 'base64');
            options = { ca: [caCert] };
        }

        connect(this.mqurl, options)
            .then((conn: Connection) => {
                const msg: string = this.credentials.ca ? 'with SSL' : '';
                utils.logInfo(`$rabbitmq (connect): Connected to Rabbit ${msg}`);
                conn.on('error', (err: Error) => this.restart(err));

                return conn.createChannel();
            })
            .then(async (channel: Channel) =>
                channel
                    .assertExchange(this.exchange, 'topic', /** @type {string} the channel name */ { durable: false })
                    .then(() => {
                        this.channel = channel;

                        this.operational = true;

                        if (this.retries > 0) {
                            const internal: IntInternal = {
                                fatal: false,
                                message: 'Rabbitmq Connected',
                                pid: process.pid,
                                source,
                                trace: ['@at $rabbitmq (assert'],
                            };

                            utils.emit('internal', internal);
                        }

                        this.retries = 0;

                        this.channel.on('close', (): void => {
                            utils.logInfo('$rabbitmq (createChannel): channel closed');

                            utils.logInfo('$rabbitmq (createChannel): retrying in 30 seconds');

                            this.restart({
                                name: '$rabbit (close): Channel closed',
                                message: 'Channel closed',
                            });
                        });

                        this.channel.on(
                            'error',
                            async (err: any): Promise<void> => {
                                err.caller = '$rabbitmq';

                                await utils.logError('$rabbitmq (createChannel): channel error)', err);
                            }
                        );

                        utils.logInfo('$rabbitmq (createChannel): channel created');
                    })
            )
            .catch((err: Error) => {
                this.restart(err);
            });
    };

    public logMsg = (mqlog: IntMQLogBase) => {
        if (this.channel && this.operational) {
            this.channel.publish(this.exchange, mqlog.channel, Buffer.from(JSON.stringify(mqlog.log)), {
                persistent: true,
            });
        }
    };

    public sentMail = (mqlog: IntMQMailBase) => {
        if (this.channel && this.operational) {
            this.channel.publish(this.exchange, mqlog.channel, Buffer.from(JSON.stringify(mqlog.mail)), {
                persistent: true,
            });
        }
    };

    public logErr = (msg: any) => {
        if (this.channel) {
            this.channel.publish(this.exchange, 'core.error.log', Buffer.from(msg), { persistent: true });

            utils.logInfo(' [>] Sent %s', msg);
        }
    };

    private restart = (err: Error) => {
        this.operational = false;
        this.retries += 1;
        setTimeout(() => {
            this.connect();
        }, 30000);

        const internal: IntInternal = {
            err,
            fatal: true,
            message: `rabbitmq Connection Error: retry: ${this.retries}`,
            pid: process.pid,
            source,
            trace: ['@at $rabbitmq (restart'],
        };

        utils.emit('internal', internal);

        utils.logInfo('$rabbitmq (createChannel): retrying in 30 seconds');
    };
}

export interface IMQ {
    logErr: (msg: any) => void;
    logMsg: (msg: IntMQLog) => void;
}

export const mq: RabbitMQ = new RabbitMQ();
