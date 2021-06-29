/* eslint-disable camelcase */

/**
 * fields to be replaced
 *
 * $CALLBACK_URL
 * $ID
 * $EMAIL
 * $JOBID
 * $JOBNAME
 * $FILEPATH
 * $TRANSID
 */

import { ChildProcessByStdio } from 'child_process';

export enum ECodeLanguage {
    python = 'python',
    spark = 'pyspark',
    scala = 'scala',
    javascript = 'javascript',
}

export interface IntStmt {
    email: string;
    py: string;
    id: string;
    transid: string;
}

export interface IntStmtOut {
    data: string;
    email: string;
    id: string;
    transid: string;
}

export interface IntJob {
    cert?: string;
    email: string;
    language: keyof typeof ECodeLanguage;
    error?: string;
    count: number | null;
    id: string;
    jobid?: string;
    jobname: string;
    name: string;
    params?: any;
    code: string;
    runby: string;
    status: string;
    transid: string;
    jobstart: Date;
    jobend: Date;
    runtime: number | null;
    out?: any;
}

export interface ServicesJob {
    code: string;
    id: string;
    transid: string;
    params: any;
    language: keyof typeof ECodeLanguage;
    serviceid: string;
    org: string;
    email: string;
}

export interface IJobResponse {
    count: number | null;
    email: string;
    error?: string | null;
    executor: string;
    id: string;
    jobend: Date | null;
    jobid?: string;
    jobstart: Date;
    log?: any[];
    name: string;
    out?: any;
    runby: string;
    runtime: number | null;
    status: string;
    transid: string;
}

export type IJob = IntStmtOut | IJobResponse;

export const green: string = '\x1b[92m%s\x1b[0m';
export const red: string = '\x1b[31m%s\x1b[0m';
export const blue: string = '\x1b[34m%s\x1b[0m';

export interface IHandler {
    ok: true;
    id: string;
    message?: string;
    error?: Error;
}

export interface IWorker {
    [index: string]: IChildProcess;
}

export interface IChildProcess extends ChildProcessByStdio<any, any, any> {
    buffer?: string;
    errbuffer?: string;
    meta?: IMeta;
}

export interface IMeta {
    cycle: number;
    size: number; // current size of the batch
    ts: number; // timestamp
    s_ts: number; // suggested timestamp
    acc_ts: number;
    acc_size: number;
}

export interface IPayload {
    inbox?: string;
    client: string;
    data?: any;
    sid?: number; // number used when the message has an id
    meta?: IMeta;
}

export interface INatsCredentials {
    clusterpassword: string;
    clustertoken?: string;
    clusteruser: string;
    ip: string;
    password?: string;
    token?: string;
    user?: string;
    seed?: string;
}

export interface IError extends Error {
    [index: string]: any;
    email?: string;
    endpoint?: string;
    location?: string;
    log?: Record<string, unknown>;
    time?: string;
    transid?: string;
    url?: string;
    blocks?: any;
    caller: string;
}

export interface IntInternal {
    source: string;
    err?: Error;
    message: string;
    fatal: boolean;
    pid: number;
    trace: string[];
}
