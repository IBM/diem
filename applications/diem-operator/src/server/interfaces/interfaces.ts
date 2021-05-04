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
}

export interface ServicesJob {
    code: string;
    id: string;
    transid: string;
    params: any;
    language: keyof typeof ECodeLanguage;
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
