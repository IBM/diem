import { RedisClient } from 'redis';
import { utils } from '@common/utils';
import { redisc } from '@common/redis';
import { slackMsg } from '@common/slack/slack';
import { getQueue } from './cron.jobs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CronCluster: any = require('cron-cluster');

export class Cron {
    private redisClient!: RedisClient;
    private cronJob: any;
    private cronTime: string;
    private cronNbr: number;
    private cron: any;

    public constructor() {
        this.redisClient = redisc;
        this.cronTime = '* * * * *';
        this.cronNbr = 0;

        this.cronJob = CronCluster(this.redisClient).CronJob;
    }

    public start = (): void => {
        this.cron = new this.cronJob({
            cronTime: this.cronTime,
            onTick: () => this.logRun(),
        });

        this.cron.start();

        void this.slack('👻 $cron (start): Cron successfully started');

        getQueue();
    };

    private logRun = (): void => {
        this.cronNbr += 1;

        utils.logInfo(`$cron (logRun): minute check - nbr: ${this.cronNbr}`);

        if (this.cronNbr % 60 === 0) {
            void this.slack(`🐱 $cron (logRun): Cron minute check (hourly confirmation) - nbr: ${this.cronNbr}`);
        }

        getQueue();
    };

    private slack = async (msg: string): Promise<void> => {
        const smsg: string = `${msg} - pid: ${process.pid}`;
        utils.logInfo(smsg);

        await slackMsg(smsg);
    };
}

export const cron: Cron = new Cron();
