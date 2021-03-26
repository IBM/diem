import { EventEmitter } from 'events';
import { printHRTime } from 'print-hrtime';
import moment from 'moment';
import { publisher } from '@config/nats_publisher';
import { IntEnv } from '../interfaces/env';
import { IError } from '../interfaces/shared';
import { Credentials } from './cfenv';

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
        K8_APPURL: `https://${process.env.K8_APPURLSHORT}` || 'https://diem.ibm.com',
        K8_APPURLSHORT: process.env.K8_APPURLSHORT || 'diem.ibm.com',
        K8_SYSTEM: process.env.K8_SYSTEM || 'test',
        K8_SYSTEM_NAME: process.env.K8_SYSTEM_NAME || 'test',
        packname: process.env.NAME || '',
        version: process.env.VERSION || '0',
    };

    private jwtToken: string;

    public get jwtTokenKey(): string {
        return this.jwtToken;
    }

    public constructor() {
        this.ev = new EventEmitter();
        this.jwtToken = Credentials('jwttoken') || `${this.Env.appcookie}`;
    }

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

    public logWarn = (msg: any) => {
        console.warn('\x1b[36m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`);
    };

    public logErr = (msg: any, err?: IError) => {
        console.error('\x1b[35m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`, '\n', err || '');
    };

    public logError = async (msg: any, err?: IError) => {
        console.error('\x1b[31m%s\x1b[0m', `${msg} - ${this.time()} - pid (${process.pid})`, '\n', err || '');

        if (err && !err.caller && err.trace) {
            err.caller = err.trace[0];
        }

        if (err) {
            await publisher.publish('error', {
                ...err,
                log: msg,
            });
        }
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
}

export const utils: Utils = new Utils();
