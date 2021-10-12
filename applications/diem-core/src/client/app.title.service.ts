import { Injectable } from '@angular/core';
import { DTS } from '@mydiem/diem-angular-util';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, switchMap } from 'rxjs/operators';
import { appConfig } from './app.config';
import { SiteService } from './site/site.service';

@Injectable({
    providedIn: 'root',
})
export class TitleService {
    private router: Router;
    private activatedRoute: ActivatedRoute;
    private dts: DTS;
    private SS: SiteService;
    private component?: string = undefined;

    public constructor(activatedRoute: ActivatedRoute, router: Router, dts: DTS, SS: SiteService) {
        this.router = router;
        this.activatedRoute = activatedRoute;
        this.dts = dts;
        this.SS = SS;
    }

    public init = (): void => {
        this.router.events
            .pipe(
                filter((event: any) => event instanceof NavigationEnd),
                map(() => this.activatedRoute),
                map((route: ActivatedRoute) => {
                    while (route.firstChild) {
                        route = route.firstChild;
                    }

                    return route;
                }),
                switchMap((route: any) => (route ? route.data : [])),
                map((data: any) => {
                    if (data.title && data.title !== this.component) {
                        this.component = data.title;
                        if (this.component) {
                            this.SS.updateComponent(this.component);
                        }
                    }

                    if (data.title && data.params && data.params.id) {
                        /** If a route has a title set (e.g. data: {title: "Foo"}) then we use it */

                        return `${appConfig.sitename}  - ${data.title}: ${data.params.id}`;
                    } else if (data.title) {
                        return `${appConfig.sitename} - ${data.title}`;
                    } else {
                        return `${appConfig.sitename} - ${this.router.url.substr(1)}`;
                    }
                })
            )
            .subscribe((pathString) => this.dts.setTitle(`${pathString}`));
    };
}
