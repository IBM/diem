import { EventEmitter } from 'events';
import { printHRTime } from 'print-hrtime';
import moment from 'moment';
import { IntMQLogBase } from '@interfaces';
import { IntEnv } from '../interfaces/env';
import { IError, IRequest } from '../interfaces/shared';
import { slackMsgInt } from './slack/error-int';
import { Credentials } from './cfenv';
import { pubSub } from './redis.pubsub';

export interface ISlack {
    emoji: string;
    deploy: { channel?: string; username?: string };
    internal: { channel?: string; username?: string };
    user: { channel?: string; username?: string };
    url: string;
}

class Utils {
    public ev: EventEmitter;

    public Env: IntEnv = {
        NODE_ENV: process.env.NODE_ENV || 'local',
        app: process.env.APP || process.env.NAME || 'rfb',
        appcookie: process.env.APPCOOKIE || 'leap-rfb',
        apppath: process.env.APPPATH || '',
        appurl: `//${process.env.K8_APPURLSHORT}${process.env.APPPATH}` || 'https://blueboard.ibm.com',
        description: process.env.DESCRIPTION || '',
        K8_APP: process.env.APP || 'noname',
        K8_APPURL: process.env.K8_APPURL || 'https://blueboard.ibm.com',
        K8_APPURLSHORT: process.env.K8_APPURLSHORT || 'blueboard.ibm.com',
        K8_SYSTEM: process.env.K8_SYSTEM || 'test',
        K8_SYSTEM_NAME: process.env.K8_SYSTEM_NAME || 'test',
        packname: process.env.NAME || '',
        version: process.env.VERSION || '0',
    };

    private SLACK: ISlack = Credentials('slack');
    private jwtToken: string;
    private slackHook: string;

    private sKey: string = 'as5HjIILYjdjet';

    public get jwtTokenKey(): string {
        return this.jwtToken;
    }

    public get sessionKey(): string {
        const t: string | undefined = process.env.sessionKey;

        if (t) {
            this.sKey = t;
        }

        return this.sKey;
    }

    public get slack(): ISlack {
        if (this.SLACK) {
            return {
                deploy: {
                    channel: this.SLACK.deploy.channel,
                    username: this.SLACK.deploy.username,
                },
                emoji: this.SLACK.emoji,
                internal: {
                    channel: this.SLACK.internal.channel,
                    username: this.SLACK.internal.username,
                },
                url: this.slackWebHook,
                user: {
                    channel: this.SLACK.user.channel,
                    username: this.SLACK.user.username,
                },
            };
        } else {
            return {
                deploy: {},
                emoji: '',
                internal: {},
                url: '',
                user: {},
            };
        }
    }

    public get slackWebHook(): string {
        return this.slackHook;
    }

    public constructor() {
        this.ev = new EventEmitter();
        this.jwtToken = Credentials('jwttoken') || `${this.Env.appcookie}`;
        this.slackHook = Credentials('slackhook') || false;
    }

    public browser = (req: any): { agent: string; ip: string } => {
        const r: { [x: string]: any } = req.headers;

        return {
            agent: r['user-agent'] || '',
            ip: r['x-forwarded-for'] || '',
        };
    };

    public log = (msg: any) => {
        console.info(`${msg} - ${this.time()}`);
    };

    public logGreen = (msg: any) => {
        console.info('\x1b[92m%s\x1b[0m', msg);
    };

    public logCyan = (msg: any) => {
        console.info('\x1b[92m%s\x1b[0m', msg);
    };

    public logInfo = (msg: any, func?: string, hrend?: any) => {
        let hr: string = '';
        const fu: string = func ? ` - ${func}` : '';

        if (hrend) {
            hr = ` - ET: ${printHRTime(hrend, { precise: true })}`;
        }

        console.info('\x1b[93m%s\x1b[0m', `${msg}${fu}${hr}`);
    };

    public logInfoT = (msg: any, func?: string, hrend?: any) => {
        let hr: string = '';
        const fu: string = func ? ` - ${func}` : '';

        if (hrend) {
            hr = ` - ET: ${printHRTime(hrend, { precise: true })}`;
        }

        console.info('\x1b[93m%s\x1b[0m', `${msg}${fu}${hr} - ${this.time()} - pid (${process.pid})`);
    };

    public logWarn = (msg: any) => {
        console.warn('\x1b[36m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`);
    };

    public logErr = (msg: any, err?: IError) => {
        console.error('\x1b[35m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`, '\n', err || '');
    };

    public logError = async (msg: any, err?: IError, slackConfig?: ISlack) => {
        console.error('\x1b[31m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`, '\n', err || '');

        if (err && !err.caller && err.trace) {
            err.caller = err.trace[0];
        }

        if (err) {
            await slackMsgInt(
                {
                    ...err,
                    log: msg,
                },
                slackConfig
            );
        }
    };

    public logMQError = async (
        msg: any,
        req: IRequest,
        status: number,
        event: string,
        err: IError,
        hrstart: [number, number] = [0, 0],
        pack: any = {}
    ) => {
        console.error('\x1b[31m%s\x1b[0m', `${msg} - ${this.time()} - ti: ${req.transid} - pid (${process.pid})`, '\n');

        if (err) {
            await slackMsgInt({
                ...err,
                log: msg,
                transid: req.transid,
            });
        }

        this.toMQ(req, status, event, err, hrstart, pack);
    };

    public time = (date?: Date, format?: string): string => {
        if (date) {
            return moment.utc(date).format(format);
        } else {
            return moment.utc(new Date()).format();
        }
    };

    public guid = () => {
        const p8: any = (s: boolean) => {
            const p: string = `${Math.random().toString(16)}000000000`.substr(2, 8);

            return s ? `-${p.substr(0, 4)}-${p.substr(4, 4)}` : p;
        };
        const t: string = p8(false) + p8(true) + p8(true) + p8(false);

        return t.toLowerCase();
    };

    public now = (): any => moment(new Date().getTime()).format('YYYY-MM-DD-HH.mm.ss.000000');

    public top: (promise: Promise<any>) => Promise<any> = async (promise: Promise<any>): Promise<any> =>
        promise.then((data: any) => [undefined, data]).catch((err: Error) => [err]);

    public emit = (event: string, msg: any) => {
        this.ev.emit(event, msg);
    };

    public hrTime: (hrstart: [number, number]) => { msec: number; sec: number } = (hrstart: [number, number]) => {
        const diff: [number, number] = process.hrtime(hrstart);
        const t: number = diff[0] * 1000 + Math.round(diff[1] / 1000000);

        return {
            msec: Math.round((diff[1] / 1000000) * 100) / 100,
            sec: diff[0],
            TRANS_END: new Date(),
            TRANS_START: new Date(new Date().setTime(new Date().getTime() - t)),
        };
    };

    public addTrace: (trace: string | string[], msg: string) => string[] = (
        trace: string | string[],
        msg: string
    ): string[] => {
        if (trace && Array.isArray(trace)) {
            trace.unshift(msg);

            return trace;
        }

        return [msg];
    };

    public toMQ = (
        req: IRequest,
        status: number,
        event: string,
        err?: Error,
        hrstart: [number, number] = [0, 0],
        pack: any = {}
    ): void => {
        const mqm: IntMQLogBase = {
            channel: 'logger',
            log: {
                annotations: {
                    execution: this.hrTime(hrstart),
                    profile: req.token,
                    time: this.time(),
                    transid: req.transid || this.guid(),
                },
                browser: this.browser(req),
                err,
                event,
                module: pack,
                request: {
                    body: req.body,
                    params: req.params,
                    query: typeof req.query === 'string' ? req.query : '',
                    url: `${req.hostname}${req.path}`,
                },
                status,
            },
        };

        pubSub.publish(mqm.channel, mqm.log);
    };
}

export const utils: Utils = new Utils();
