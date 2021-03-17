import { RedisClient } from 'redis';
import { Redis } from './redis';

class PubSubServer {
    public pub: RedisClient;

    public constructor() {
        this.pub = new Redis().redisClient;
    }

    public toString: (json: any) => string = (json: any) => JSON.stringify(json);

    public toJson: (text: string) => any = (text: string) => JSON.parse(text);

    public publish: (channel: string, data: any) => void = (channel: string, data: any) => {
        this.pub.publish(channel, JSON.stringify({ ...data }));
    };
}

export const pubSub: PubSubServer = new PubSubServer();
