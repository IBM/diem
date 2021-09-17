import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Env, IUser } from '@mydiem/diem-angular-util';

@Injectable()
export class MainRoutingGuard implements CanActivate {
    private user: IUser;
    private env: Env;
    private router: Router;

    public constructor(env: Env, router: Router) {
        this.env = env;
        this.router = router;
        this.user = this.env.user;
    }

    public canActivate(next: ActivatedRouteSnapshot): boolean {
        /** Get the jobdetailed path */
        const access: number = next.data && next.data.access ? next.data.access : 0;

        /** Always make sure we have an authorized user */

        if (this.user.authorized) {
            /** poall is a protected route */
            if (this.env.user && this.env.user.rolenbr >= access) {
                /** reed the userprofile and check for the admin role */

                console.info(
                    `$main.routing.guard (canActivate): Allowed activation as the rolenbr of ${this.user.email} (${this.env.user.rolenbr}) is passing ${access} `
                );

                return true;

                /** user is not an admin an needs to be redirected to poall */
            }

            /** All other users that are not jobdetailing the poall route */

            console.info(
                `$main.routing.guard (canActivate): Redirecting to 401 as the rolenbr of ${this.user.email} (${this.env.user.rolenbr}) is not passing ${access}`
            );

            this.router
                .navigate(['401'])
                .catch((err: Error) => console.error('$main.routing.guard (canActivate): error', err));

            return false;
        } else {
            /** Not authenticated users need to be redirected to the login page */

            console.info(`$main.routing.guard (canActivate): Allowed activation as ${this.user.email} is not allowed`);
            this.router
                .navigate(['login'])
                .catch((err: Error) => console.error('$main.routing.guard (canActivate): error', err));

            return false;
        }
    }
}
