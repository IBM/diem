import { Injectable } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { appConfig } from './app.config';
import { AppLoginService } from './app.login';

@Injectable({
    providedIn: 'root',
})
export class AppInit {
    private env: Env;
    private loginService: AppLoginService;

    public constructor(env: Env, loginService: AppLoginService) {
        this.env = env;
        this.loginService = loginService;
    }

    public initializeApp(): void {
        this.env.setField('appConfig', appConfig);

        this.loginService.setUser();

        /** Prevent documents from being dropped */

        /* is this needed ?
        window.addEventListener(
            'dragover',
            (e: Event) => {
                e.preventDefault();
            },
            false
        );
        window.addEventListener(
            'drop',
            (e: Event) => {
                e.preventDefault();
            },
            false
        );
        */
    }
}
