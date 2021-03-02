import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Injectable } from '@angular/core';
import { modules } from '../../app.config';

@Injectable()
export class MainModuleResolver implements Resolve<any> {
    public constructor() {
        /** */
    }

    public resolve = async (route: ActivatedRouteSnapshot): Promise<any> => modules()[route.url[0].path];
}
