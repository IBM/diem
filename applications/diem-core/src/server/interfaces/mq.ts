import { IntEnv } from '../interfaces/env';

export type ELogEvent = 'resource' | 'login' | 'error' | 'api';

/**
 * Shared MQ Log
 *
 * @export
 * @interface IntMQLog
 */
export interface IntMQLog {
    logid: string;
    created: Date;
    annotations: {
        profile?: {
            [key: string]: any;
            email: string;
            name: string;
        };
        org: string;
        execution?: {
            msec: number;
            sec: number;
        };
        transid: string;
    };
    browser: {
        [index: string]: any;
        agent?: string;
        ip?: string;
    };
    err?: Error;
    event: string;
    module: IntEnv;
    request: {
        body: any;
        params: any;
        query: string;
        url: string;
    };
    status: number;
    type: ELogEvent;
}

/**
 * Base interface for sending objects to MQ
 *
 * @property {string} channel
 * @property {IntMQLog} IntMQLog
 * @export
 * @interface IntMQLogBase
 */
export interface IntMQLogBase {
    channel: string;
    log: IntMQLog;
}

/**
 * IntMail interface
 */
export interface IntMail {
    attachments: any[];
    cc: any[];
    contact: string;
    html: string;
    recipients: any[];
    subject: string;
    transid: string;
}

/**
 * Base interface for sending objects to MQ
 *
 * @property {string} channel
 * @property {any} mail
 * @export
 * @interface IntMQMailBase
 */
export interface IntMQMailBase {
    channel: string;
    mail: IntMail;
}
