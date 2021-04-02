import { utils } from '@common/utils';
import { Redis } from '@common/redis';
import { RedisClient } from 'redis';
import { IntEnv } from '@interfaces';
import { IJobResponse, IClientPayload, ISocketPayload } from '@models';
import { jobHandler } from '../routes/job.backend/job.handler';
import { addTrace } from '../routes/shared/functions';
import { publisher } from './nats_publisher';

const clientpayload: string = 'client-payload';

export class Server {
    public pack: IntEnv;

    public pub: RedisClient;
    public sub: RedisClient;

    public constructor() {
        this.pack = utils.Env;

        this.pub = new Redis().redisClient;
        this.sub = new Redis().redisClient;

        this.sub.subscribe(['global', 'user', 'np_interactive', 'nodepy', 'spark_master', clientpayload]);

        this.sub.on('message', async (channel, msg) => {
            const json: any = this.toJson(msg);
            if (channel === 'nodepy') {
                await this.publish(json);
            } else {
                // nada
            }
        });
    }

    public publish: (job: IJobResponse) => Promise<void> = async (job: IJobResponse): Promise<void> => {
        try {
            // setTimeout(async () => {
            const pl: ISocketPayload | void = await jobHandler(job);
            /* pass the message to redis for global handling */

            utils.logInfo(`$pubsub (publish): publishing payload - job: ${job.id}`);

            void publisher.publish('global.core.users', pl);

            return Promise.resolve();
            // }, 1);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $pubsub (publish)');

            await utils.logError(`$pubsub (publish): error - job: ${job.id}`, err);

            return Promise.reject(err);
        }
    };

    public publishClient: (message: string) => void = (message: string) => {
        /* pass the message to redis for global handling */

        void publisher.publish('global.core.user', message);
    };

    public publishClientPayload: (clientPayload: IClientPayload) => void = (clientPayload: IClientPayload) => {
        /* pass the message to redis for global handling */

        void publisher.publish(clientpayload, clientPayload);
    };

    public toString: (json: any) => string = (json: any) => JSON.stringify(json);

    public toJson: (text: string) => any = (text: string) => JSON.parse(text);
}

export const pubSub: Server = new Server();
