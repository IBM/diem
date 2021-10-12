/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SiteService {
    private componentSubject = new Subject<string>();

    // Observable string streams
    get componentUpdate(): Observable<any> {
        return this.componentSubject.asObservable();
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public updateComponent(component: string): any {
        return this.componentSubject.next(component);
    }
}
