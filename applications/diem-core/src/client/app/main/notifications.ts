/* eslint-disable @typescript-eslint/no-this-alias */
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class PushNotificationsService {
    public permission: Permission;

    public constructor() {
        this.permission = this.isSupported() ? 'default' : 'denied';
    }

    // eslint-disable-next-line class-methods-use-this
    public isSupported = (): boolean => 'Notification' in window;

    public requestPermission = async (): Promise<void> => {
        const self: this = this;

        if ('Notification' in window) {
            await Notification.requestPermission((status) => (self.permission = status));
        }
    };

    public create(title: string, options?: IPushNotification): any {
        const self: this = this;

        return new Observable((obs) => {
            const r: any = (e: Event) =>
                obs.next({
                    event: e,
                    notification: _notify,
                });

            const re: any = (e: Event) =>
                obs.error({
                    event: e,
                    notification: _notify,
                });

            if (!('Notification' in window)) {
                console.info('Notifications are not available in this environment');
                obs.complete();
            }
            if (self.permission !== 'granted') {
                console.info("The user hasn't granted you permission to send push notifications");
                obs.complete();
            }
            const _notify: any = new Notification(title, options);

            _notify.onshow = (e: Event) => r(e);

            _notify.onclick = (e: Event) => r(e);

            _notify.onerror = (e: Event) => re(e);

            _notify.onclose = () => obs.complete();
        });
    }

    public generateNotification(source: any[]): void {
        const self: this = this;

        source.forEach((item) => {
            const options: any = {
                body: item.alertContent,
            };
            self.create(item.title, options).subscribe();
        });
    }
}

export declare type Permission = 'denied' | 'granted' | 'default';

export interface IPushNotification {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    renotify?: boolean;
    silent?: boolean;
    sound?: string;
    noscreen?: boolean;
    sticky?: boolean;
    dir?: 'auto' | 'ltr' | 'rtl';
    lang?: string;
    vibrate?: number[];
}
