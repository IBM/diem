import { IntEnv } from '@interfaces';
import { utils } from '@common/utils';
import { Redis } from '@common/redis';
import { RedisClient } from 'redis';
import { stopWorker } from '../routes/etl/etl.workers';
import { IJob } from './interfaces';

class PubSubServer {
    public pack: IntEnv;

    public pub: RedisClient;
    public sub: RedisClient;

    public constructor() {
        this.pack = utils.Env;

        this.pub = new Redis().redisClient;
        this.sub = new Redis().redisClient;

        this.sub.subscribe(['np_worker']);

        this.sub.on('message', (channel, msg) => {
            const json: any = this.toJson(msg);

            if (channel === 'np_worker' && json.action === 'stop') {
                stopWorker(json.job).catch((err: any) => {
                    void utils.logError('pubsub (message)', err);
                });
            }
        });
    }

    public toString: (json: any) => string = (json: any) => JSON.stringify(json);

    public toJson: (text: string) => any = (text: string) => JSON.parse(text);

    public publish: (channel: string, data: IJob) => void = (channel: string, data: IJob) => {
        this.pub.publish(channel, JSON.stringify({ ...data }));
    };
}

export const pubSub: PubSubServer = new PubSubServer();
