/* eslint-disable class-methods-use-this */
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable() /* This is #1 */
export class DTS {
    private titleService: Title;

    public constructor(titleService: Title) {
        this.titleService = titleService;
    }

    public setTitle(title: string): void {
        this.titleService.setTitle(title);
    }

    public getDate = (dt: string): any => new Date(parseInt(dt, 10));

    public newId = (): string => {
        const N: number = 7;

        return Array(N + 1)
            .join(`${Math.random().toString(36)}00000000000000000`.slice(2, 18))
            .slice(0, N);
    };

    public guid = (): string => {
        const p8: any = (s: boolean) => {
            const p: string = `${Math.random().toString(16)}000000000`.substr(2, 8);

            return s ? `-${p.substr(0, 4)}-${p.substr(4, 4)}` : p;
        };
        const t: string = p8(false) + p8(true) + p8(true) + p8(false);

        return t.toLowerCase();
    };

    public getCookie = (name: string): string | undefined => {
        const nameEQ: string = `${name}=`;
        const ca: any[] = document.cookie.split(';');
        for (let c of ca) {
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                const co: string = c.substring(nameEQ.length, c.length);
                if (co === undefined || co === 'undefined') {
                    return undefined;
                }

                return co;
            }
        }

        return undefined;
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public flattenObject = (ob: any): any => {
        const toReturn: any = {};

        for (const i in ob) {
            if (!Object.prototype.hasOwnProperty.call(ob, i)) {
                continue;
            }

            if (typeof ob[i] === 'object') {
                const flatObject: any = this.flattenObject(ob[i]);
                for (const x in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                        continue;
                    }
                    toReturn[x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob[i];
            }
        }

        return toReturn;
    };
}
