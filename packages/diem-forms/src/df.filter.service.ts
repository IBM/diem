/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class DFFilterService {
    // Observable string sources
    private filterSubject = new Subject<string>();

    // Observable string streams
    get filterUpdate(): Observable<any> {
        return this.filterSubject.asObservable();
    }

    // Service message commands

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public updateFilter(filter: any): any {
        return this.filterSubject.next(filter);
    }
}
