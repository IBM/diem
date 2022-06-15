/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';

@Injectable()
export class DFCommonService {
    public form$: any;
    private formSource: any;

    public constructor() {
        this.formSource = new Subject<any>();
        this.form$ = this.formSource.asObservable().pipe(share());
    }

    public formChanged(options: any): any {
        this.formSource.next(options);

        return this;
    }

    // eslint-disable-next-line class-methods-use-this
    public guid = () => {
        const _p8: any = (s: boolean) => {
            const p: string = `${Math.random().toString(16)}000000000`.substr(2, 8);

            return s ? `-${p.substr(0, 4)}-${p.substr(4, 4)}` : p;
        };
        const t: string = _p8(false) + _p8(true) + _p8(true) + _p8(false);

        return t.toLowerCase();
    };

    public addClass = (element: any, className: string): void => {
        if (element.classList) {
            element.classList.add(className);
        } else {
            element.className += ` ${className}`;
        }
    };

    public removeClass = (element: any, className: string): void => {
        if (element.classList) {
            element.classList.remove(className);
        } else {
            element.className = element.className.replace(
                // eslint-disable-next-line prefer-template
                new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'),
                ' '
            );
        }
    };
}
