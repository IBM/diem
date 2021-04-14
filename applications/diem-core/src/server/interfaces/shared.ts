import { Request } from 'express';
import { IntPassportUser, IXorg } from './env';

export { Request };

export { NextFunction, Response as IResponse } from 'express';

export interface IProfile {
    email: string;
    name: string;
    roles: string[];
    iat?: number;
    exp?: number;
    token?: string;
    xorg?: IXorg;
}

export interface IFile {
    [index: string]: any;
    data: Buffer;
    encoding: string;
    name: string;
    type: string;
}

export interface IRequest extends Request {
    [index: string]: any;
    sessionid?: string;
    token: IProfile;
    transid: string;
    user: IntPassportUser;
    files?: IFile[];
    session: any;
    xorg?: IXorg;
}

export interface IntInternal {
    source: string;
    err?: Error;
    message: string;
    fatal: boolean;
    pid: number;
    trace: string[];
    retry?: number;
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

// eslint-disable-next-line no-shadow
export enum EStoreActions {
    ADD_DATA = 'ADD_DATA',
    ADD_FORM_DATA = 'ADD_FORM_DATA',
    ADD_STORE = 'ADD_STORE',
    UPD_STORE = 'UPD_STORE',
    REM_STORE = 'REM_STORE',
    ADD_STORE_RCD = 'ADD_STORE_RCD',
    UPD_STORE_RCD = 'UPD_STORE_RCD',
    REM_STORE_RCD = 'REM_STORE_RCD',
    ADD_STORE_FIELD_RCD = 'ADD_STORE_FIELD_RCD',
    UPD_STORE_FIELD_RCD = 'UPD_STORE_FIELD_RCD',
    ADD_STORE_ITEM_RCD = 'ADD_STORE_ITEM_RCD',
    UPD_STORE_ITEM_RCD = 'UPD_STORE_ITEM_RCD',
    REM_STORE_ITEM_RCD = 'REM_STORE_ITEM_RCD',
    UPD_STORE_FORM_RCD = 'UPD_STORE_FORM_RCD',
    UPD_STORE_RECORDS = 'UPD_STORE_RECORDS',
    UPD_STORE_VALUES = 'UPD_STORE_VALUES',
    ADD_STORE_TABLE_RCD = 'ADD_STORE_TABLE_RCD',
    UPD_STORE_TABLE_RCD = 'UPD_STORE_TABLE_RCD',
    REM_STORE_TABLE_RCD = 'REM_STORE_TABLE_RCD',
    RESET_FORM_STORE = 'RESET_FORM_STORE',
    RESET_STORE = 'RESET_STORE',
}

export interface IntClientAnnotations {
    return?: any;
}
