import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable()
export class MainParamResolver implements Resolve<any> {
    public constructor() {
        /** */
    }

    public resolve = async (route: ActivatedRouteSnapshot): Promise<any> => route.params;
}
