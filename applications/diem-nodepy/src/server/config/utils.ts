/* eslint-disable class-methods-use-this */
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { printHRTime } from 'print-hrtime';
import moment from 'moment';
import { IError } from '@interfaces';
import { IntEnv } from '../interfaces/env';

class Utils {
    public ev: EventEmitter;

    public Env: IntEnv = {
        NODE_ENV: process.env.NODE_ENV || 'local',
        app: process.env.APP || process.env.NAME || 'nodepy',
        description: process.env.DESCRIPTION || '',
        K8_APP: process.env.APP || 'noname',
        K8_SYSTEM: process.env.K8_SYSTEM || 'test',
        K8_SYSTEM_NAME: process.env.K8_SYSTEM_NAME || 'test',
        packname: process.env.NAME || '',
        version: process.env.VERSION || '0',
    };

    public constructor() {
        this.ev = new EventEmitter();
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
        let hr = '';
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
    };

    public time = (date?: Date, format?: string): string => {
        if (date) {
            return moment.utc(date).format(format);
        } else {
            return moment.utc(new Date()).format();
        }
    };

    public guid = () => randomUUID();

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
