import { Injectable } from '@angular/core';
import { CanActivate, CanLoad, Router } from '@angular/router';
import { Env, IUser } from '@mydiem/diem-angular-util';

@Injectable({
    providedIn: 'root',
})
export class AppRoutingGuard implements CanActivate, CanLoad {
    private user: IUser;
    private env: Env;
    private router: Router;

    public constructor(env: Env, router: Router) {
        this.env = env;
        this.router = router;
        this.user = this.env.user;
    }

    public canActivate = async (): Promise<any> =>
        new Promise((resolve) => {
            if (this.user.email) {
                console.info(
                    `$app.routing.guard (canActivate): Allowing activation as ${this.user.email} is logged in`
                );
                resolve(true);
            } else {
                console.info('$app.routing.guard (canActivate): Not allowing activation as this user in not logged in');
                this.router
                    .navigate(['401'])
                    .catch((err: Error) => console.error('$app.routing.guard (canActivate): error', err));

                /* we stop here and we route the user to the module
                 there's no routing so he can continue (which is the login page :) */
                resolve(false);
            }
        });

    public canLoad = async (): Promise<any> =>
        new Promise((resolve) => {
            if (this.user.email && this.user.authorized) {
                console.info(
                    `$app.routing.guard (canLoad): Allowed loading as ${this.user.email} is logged in and allowed`
                );

                resolve(true);
            } else if (this.user.email) {
                console.info(
                    `$app.routing.guard (canLoad): Prevent loading as ${this.user.email} is logged in but not allowed `
                );
                this.router
                    .navigate(['401'])
                    .catch((err: Error) => console.error('$app.routing.guard (canLoad): error', err));

                resolve(false);
            } else {
                console.info('$app.routing.guard (canLoad): Redirecting back to login as user is not logged in');
                this.router
                    .navigate(['401'])
                    .catch((err: Error) => console.error('$app.routing.guard (canLoad): error', err));

                resolve(false);
            }
        });
}
