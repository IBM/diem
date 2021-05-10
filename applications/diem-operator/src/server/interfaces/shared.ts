export interface IntInternal {
    source: string;
    err?: Error;
    message: string;
    fatal: boolean;
    pid: number;
    trace: string[];
}

/**
 * @param {string} email
 *
 * @interface IError
 * @extends {Error}
 */
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
