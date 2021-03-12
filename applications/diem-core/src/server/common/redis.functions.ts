import { promisify } from 'util';
import { Redis, redisc } from './redis';

class RedisFunctions {
    private getAsyncProm: (query: string) => Promise<any>;
    private setAsyncProm: (query: string, data: any, expire?: string, ttl?: number) => Promise<any>;

    public constructor() {
        const redisClient: Redis['redisClient'] = redisc;
        this.getAsyncProm = promisify(redisClient.get).bind(redisClient);
        this.setAsyncProm = promisify(redisClient.set).bind(redisClient);
    }

    public getAsync: (query: string) => Promise<any> = async (query: string): Promise<any> => {
        const data: any = await this.getAsyncProm(query);

        try {
            return Promise.resolve(JSON.parse(data));
        } catch (err) {
            return Promise.resolve(data);
        }
    };

    public setAsync: (query: string, data: any, expire?: string, ttl?: number) => Promise<any> = async (
        query: string,
        data: any,
        expire?: string,
        ttl?: number
    ): Promise<any> => {
        if (typeof data === 'object') {
            if (expire && ttl) {
                await this.setAsyncProm(query, JSON.stringify(data), expire, ttl);
            } else {
                await this.setAsyncProm(query, JSON.stringify(data));
            }

            return Promise.resolve();
        }

        await this.setAsyncProm(query, data, expire, ttl);

        return Promise.resolve();
    };
}

export const redisf: RedisFunctions = new RedisFunctions();
