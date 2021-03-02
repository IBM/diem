import { filter } from 'rxjs/operators';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()

/**
 * POSSIBLE TO DELETE !!!!!!
 */
export class MainRouterService {
    public routerSubject = new Subject();

    private route: ActivatedRoute;
    private router: Router;

    public constructor(route: ActivatedRoute, router: Router) {
        this.route = route;
        this.router = router;

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            let currentRoute: any = this.route.root;
            while (currentRoute.children[0] !== undefined) {
                currentRoute = currentRoute.children[0];
            }
            this.routerSubject.next({ url: this.getUrl(currentRoute.url.value) });
        });
    }

    private getUrl: any = (x: any): any => {
        const obj: any[] = [];
        x.forEach((el: any) => {
            obj.push(el.path);
        });

        return obj;
    };
}
