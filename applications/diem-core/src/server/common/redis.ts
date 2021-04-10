/* eslint-disable camelcase */
import { createClient, RedisClient } from 'redis';
import { IntInternal } from '../interfaces/shared';
import { Credentials } from '../common/cfenv';
import { utils } from '../common/utils';

export { RedisClient };

const source: string = '@leap-common/$redis';

interface IRedisOptions {
    attempt: number;
    error: {
        code?: string;
        port?: number;
        address?: string;
    } | null;
    // eslint-disable-next-line camelcase
    total_retry_time: number;
}

interface IRedis {
    retries: number;
    address?: string;
    application: string;
    code: any;
    message: string;
    name: 'redisconnect';
    unavailable: string;
}

const millisToMinutesAndSeconds: (millis: number) => string = (millis: number): string => {
    const minutes: number = Math.floor(millis / 60000);
    const seconds: string = ((millis % 60000) / 1000).toFixed(0);

    return `${minutes}:${seconds}`;
};

export class Redis {
    public redisClient!: RedisClient;

    private credentials: { uri: string; ca?: string } = Credentials('redis');

    private retries: number = 0;

    public constructor() {
        this.start();
    }

    private start = (): void => {
        if (!this.credentials || !this.credentials.uri) {
            console.info(`$redis (start): No Uri found - We cannot proceed - pid: ${process.pid}`);

            return;
        }

        if (this.credentials.ca) {
            const ca: string = Buffer.from(this.credentials.ca, 'base64').toString('utf-8');
            const tls: Record<string, unknown> = { ca };

            console.info(`$redis (constructor): Connecting to the Redis service using SSL - pid: ${process.pid}`);

            this.redisClient = createClient(this.credentials.uri, {
                tls,
                retry_strategy: this.redisRetryStrategy,
            });
        } else {
            console.info(`$redis (constructor): Connecting to the Redis service - pid: ${process.pid}`);
            this.redisClient = createClient(this.credentials.uri, {
                retry_strategy: this.redisRetryStrategy,
            });
        }

        this.redisClient.on('connect', () => {
            // console.info(`$redis (constructor): Connected to Redis ${this.credentials.ca ? 'with SSL' : ''}`);
        });

        this.redisClient.on('reconnecting', () => {
            // we increment the collcount to track is this is a persistent problem

            this.retries++; // this shoudl increase 1 (connected)

            if (this.retries > 2) {
                const ssl: string = this.credentials.ca ? 'with SSL' : '';
                // 2 as we always want 1 connection
                utils.logWarn(
                    `$redis (constructor): Reconnecting to Redis ${ssl} - retry: ${this.retries} retries - pid: ${process.pid}`
                );
            }
        });

        this.redisClient.on('ready', () => {
            if (this.retries < 1 || this.retries > 2) {
                // we exclude 0 (startup) and 2 , just a simple reconnect
                console.info(`$redis (constructor): Redis ready after ${this.retries} retries - pid: ${process.pid}`);

                const internal: IntInternal = {
                    fatal: false,
                    message: 'Redis Connected',
                    pid: process.pid,
                    source: '@leap-common/$redis',
                    trace: ['@at $redis (ready'],
                };

                utils.emit('internal', internal);
            }

            this.retries = 1; // set it back
        });

        this.redisClient.on('error', (err: any) => {
            const internal: IntInternal = {
                err,
                fatal: true,
                message: 'Redis Connection Error',
                pid: process.pid,
                source,
                trace: ['@at $redis (error)'],
            };

            utils.emit('internal', internal);
        });
    };

    private redisRetryStrategy: (options: IRedisOptions) => any = (options: IRedisOptions) => {
        const redisError: IRedis = {
            address: options.error ? options.error.address : '',
            application: utils.Env.K8_APP,
            code: options.error ? options.error.code : '',
            message: 'redis connection error',
            name: 'redisconnect',
            retries: options.attempt,
            unavailable: millisToMinutesAndSeconds(options.total_retry_time),
        };

        if (options.error && options.error.code) {
            // End reconnecting on a specific error and flush all commands with
            // a individual error
            console.error('$redis (redisRetryStrategy): error', redisError);
        }

        /* error logging not needed as will be done by the application */

        if (redisError.retries > 5) {
            // one more then 2
            const internal: IntInternal = {
                err: redisError,
                fatal: true,
                message: `Redis Connection Error after ${redisError.retries} retries`,
                pid: process.pid,
                source,
                trace: ['@at $redis (retries'],
            };

            return utils.emit('internal', internal);
        } else {
            console.info(
                `$redis (redisRetryStrategy): Redis connection retry: ${redisError.retries} - pid: ${process.pid}`
            );
        }

        return 10000;
    };
}

export const redisc: RedisClient = new Redis().redisClient;
