import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable()
export class MainParamResolver implements Resolve<any> {
    public constructor() {
        /** */
    }

    // eslint-disable-next-line class-methods-use-this
    public resolve = async (route: ActivatedRouteSnapshot): Promise<any> => route.params;
}
