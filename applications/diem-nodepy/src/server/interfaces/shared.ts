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

export interface IntStoreState {
    payload: any;
    type: string;
}

export interface IntSharedAction {
    sessionid?: string;
    type: string;
    target?: string;
    targetid?: string;
    params?: {
        [index: string]: any;
        route?: string;
    };
}

export interface IntPayload {
    forcestore?: string;
    key?: string;
    loaded: boolean;
    sessionid?: string;
    store: string;
    target?: string;
    targetid?: string;
    type: string;
    unshift?: boolean;
    values: any;
    options?: any;
}

export interface IntServerPayload {
    ok?: boolean;
    payload?: IntPayload[];
    proceed?: boolean;
    success?: boolean;
    actions?: IntSharedAction[];
    message?: string;
    email?: string;
}

/** interface used by the new request api for return values */
export interface IntApiRequestPayload {
    success: boolean;
    message: string;
    id: string;
    transid: string;
}


export interface IntClientAnnotations {
    return?: any;
}
