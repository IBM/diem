/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface IUser {
    [index: string]: any;
    email?: string;
    name?: string;
    token?: string;
    authorized: boolean;
    roles: any;
    xorg?: {
        current: {
            org: string;
            role: string;
        };
        orgs: string[];
    };
}

@Injectable() /* This is #1 */
export class Env {
    public user: IUser;
    public progress$: Observable<any>;
    public bodyClass$: Observable<any>;

    private envrecord: any;
    private config: any;
    private progressSource = new Subject<any>();
    private bodyClassSource = new Subject<any>();
    private bodyClassField: string = '';

    public constructor() {
        this.config = {
            bodyClass: '',
        };
        this.user = {
            authorized: false,
            email: undefined,
            name: undefined,
            roles: [],
            token: undefined,
        };
        this.envrecord = {};

        this.progress$ = this.progressSource.asObservable();
        this.bodyClass$ = this.bodyClassSource.asObservable();
    }

    get record(): any {
        return this.envrecord;
    }

    set record(record: any) {
        this.envrecord = record;
    }

    get bodyClass(): string {
        return this.bodyClassField;
    }

    set bodyClass(value: string) {
        this.bodyClassField = value;
        this.bodyClassSource.next(value);
    }

    public getField = (field: any): any => this.config[field];

    public setField = (field: string, value: any): void => (this.config[field] = value);

    public removeField = (field: string): void => {
        delete this.config[field];
    };

    public setUser = (obj: any): void => {
        for (const prop in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
                continue;
            }
            this.user[prop] = obj[prop];
        }
        console.info('$env (setUser show email) => ', this.user.email);
    };

    public getUser = (): any => this.user;

    public revokeUser = (): void => {
        this.user = {
            authorized: false,
            email: undefined,
            loggedIn: false,
            name: undefined,
            roles: {},
            token: undefined,
        };
    };

    public nextProgress = (msg: string): any => {
        this.progressSource.next(msg);
    };

    public nextClass = (bodyClass: string, remove: boolean = false): any => {
        this.bodyClassSource.next({ bodyClass, remove });
    };
}
