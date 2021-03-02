/* eslint-disable @typescript-eslint/indent */
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { DTS, Env } from '@mydiem/diem-angular-util';
import { Store } from '@ngrx/store';
import { timer } from 'rxjs';
import { IXorg } from '@interfaces';
import { appConfig } from './app.config';

interface ITokendec {
    email: string;
    name: string;
    roles: any;
    xorg?: IXorg;
}

interface IUserData extends ITokendec {
    authorized: boolean;
    consent?: boolean;
    name: string;
    token: string;
    role: string;
    rolenbr: number;
}

@Injectable({
    providedIn: 'root',
})
export class AppLoginService {
    private jwtHelper: JwtHelperService;
    private dts: DTS;
    private env: Env;
    private store: Store<any>;

    public constructor(dts: DTS, env: Env, store: Store<any>) {
        this.jwtHelper = new JwtHelperService();
        this.dts = dts;
        this.env = env;
        this.store = store;
    }

    public setUser(): void {
        let valid: boolean = false;

        const cookie: string | undefined = this.dts.getCookie(appConfig.appcookie);

        if (cookie === undefined) {
            console.info('$login (check for token): no user token', appConfig.appcookie);

            return this.env.revokeUser();
        }

        try {
            valid = !this.jwtHelper.isTokenExpired(cookie);
        } catch (err) {
            valid = false;
        }

        if (!valid) {
            console.info('$login (verify token): deleting invalid token');
            document.cookie = `${appConfig.appcookie}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;

            return this.env.revokeUser();
        }

        const expDate: Date | null = this.jwtHelper.getTokenExpirationDate(cookie);
        let expTime: number = 0;
        let nowTime: number = 0;

        if (expDate) {
            expTime = new Date(expDate).getTime() || 0;
        }

        const source: any = timer(10000, 300000);

        source.subscribe(() => {
            nowTime = new Date().getTime();

            const secondsToGo: number = expTime - nowTime;
            console.info(`$app.login: ${Math.floor(secondsToGo / 1000 / 60)} minutes before your session expires`);

            if (secondsToGo <= 300000) {
                const detail: string =
                    secondsToGo < 1
                        ? `Attention, your session has expired since ${Math.floor(
                              (secondsToGo / 1000 / 60) * -1
                          )} minutes.
                           Please reload/refresh your screen prior taking any new action.`
                        : `Attention, your session will expire in ${Math.floor(secondsToGo / 1000 / 60)} minutes.
                           Please finish any work ongoing. Once expired please reload/refresh`;

                this.store.dispatch({
                    detail,
                    key: 'bl',
                    nostack: true,
                    sticky: true,
                    type: 'WARN',
                });
            }
        });

        const sessionid: string = this.dts.guid();
        this.env.setField('sessionid', sessionid);

        console.debug(`$login (valid token): token expires ${expDate} - session opened with id ${sessionid}`);

        const tokendec: ITokendec = this.jwtHelper.decodeToken(cookie);

        const profile: IUserData = {
            authorized: tokendec.roles && Array.isArray(tokendec.roles) && tokendec.roles.includes('authorized'),
            consent: tokendec.roles && Array.isArray(tokendec.roles) && tokendec.roles.includes('consent'),
            email: tokendec.email,
            name: tokendec.name,
            roles: tokendec.roles || [],
            token: cookie,
            xorg: tokendec.xorg,
            role: 'none',
            rolenbr: 0,
        };

        if (tokendec.xorg && tokendec.xorg.current && tokendec.xorg.current.role) {
            profile.role = tokendec.xorg.current.role;
            profile.rolenbr = tokendec.xorg.current.rolenbr;
        }

        console.info(`$login (User Roles): ${JSON.stringify(profile)}`);

        this.env.setUser(profile);

        /* specific for etlm the orgs*/
    }
}
