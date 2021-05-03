import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Store } from '@ngrx/store';
import { IntPayload, IntSharedAction, IntStoreState } from '@interfaces';
import { DFCommonService, DFStoreFunctions } from '@mydiem/diem-forms';
import { Observable, Subject } from 'rxjs';
import { Env } from '@mydiem/diem-angular-util';
import { SiteStoreStatus } from '../../site/site.store';
import { PushNotificationsService } from './notifications';

interface IntSharedAction2 extends IntSharedAction {
    store: string;
}

interface IntMessage {
    payload: any;
    actions: any;
    message: any;
    detail: any;
    title: string;
    success: boolean;
    email?: string;
}

interface IntError extends Error {
    type: string;
}

@Injectable()
export class SocketService {
    public message$: Observable<any>;

    private subject!: WebSocketSubject<any>;
    private isInRetry: boolean = false;
    private timeout: any;
    private count: number = 0;
    private store: Store<any>;
    private messageSource = new Subject<any>();
    private DSF: DFStoreFunctions;
    private DFCS: DFCommonService;
    private env: Env;
    private notificationService: PushNotificationsService;

    private sessionid?: string;

    public constructor(
        store: Store<any>,
        DSF: DFStoreFunctions,
        DFCS: DFCommonService,
        env: Env,
        notificationService: PushNotificationsService
    ) {
        this.connectSocket();
        this.store = store;
        this.DSF = DSF;
        this.message$ = this.messageSource.asObservable();
        this.DFCS = DFCS;
        this.env = env;

        this.sessionid = this.env.getField('sessionid');

        this.notificationService = notificationService;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public msg = (message: any): void => this.subject.next(message);

    public dispatch = (data: IntStoreState): void => {
        this.store.dispatch(data);
    };

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private messageHandler = (message: IntMessage): void => {
        if (message.payload) {
            /* we have back a payload so first if not an arry turn it into an arry, then handle */

            let forme: boolean = false; // if there's a messagew make sure it's only for me

            message.payload.forEach((load: IntPayload) => {
                const store: string = this.DSF.r_getStore(load.store);
                /**
                 * either it's a jobs store update or if it's a job , then only update the store if the target of the payload
                 * equals the name of the store
                 */
                if (
                    (!load.targetid && !load.sessionid) ||
                    (load.targetid && store.includes(load.targetid)) ||
                    (load.sessionid && load.sessionid === this.sessionid)
                ) {
                    const payload: IntPayload = {
                        key: load.key,
                        loaded: load.loaded ? load.loaded : true,
                        options: load.options,
                        store,
                        type: load.type,
                        unshift: load.unshift,
                        values: load?.values,
                    };
                    this.dispatch({
                        payload,
                        type: load.type,
                    });

                    forme = true;
                }
            });

            /* moving the message here so that popup messages are only for those intended
             * the forme is a boolean that ensures messages are only for the intended
             * or the message is for the current email
             */
            if ((message.message && forme) || (message.email && message.email === this.env.user.email)) {
                console.info('$socket.api (messageHandler): new socket message');
                this.store.dispatch({
                    detail: message.message,
                    type: message.success === true ? SiteStoreStatus.SUCCESS : SiteStoreStatus.ERROR,
                    key: 'br',
                });
            }
        }

        if (message.actions) {
            message.actions.forEach((action: IntSharedAction2) => {
                const id: string = this.DSF.r_getLastUrlPart();
                if (
                    (!action.targetid && !action.sessionid) ||
                    (action.targetid && id && id === action.targetid) ||
                    (action.sessionid && action.sessionid === this.sessionid)
                ) {
                    this.DFCS.formChanged(action);
                }
            });
        }

        if (message.detail) {
            console.info('$socket.api (messageHandler): new notification message');

            const data: any[] = [];

            data.push({
                alertContent: message.detail,
                title: message.title,
            });

            this.notificationService.generateNotification(data);
        }
    };

    private connectSocket = (): void => {
        this.subject = webSocket({
            openObserver: {
                next: async () => {
                    if (this.isInRetry) {
                        this.stopRetry();
                    }
                    console.info('$socket.api (connectSocket): socket connected');
                    this.setBodyClass();
                    this.count = 0;

                    await this.notificationService.requestPermission();
                },
            },
            closeObserver: {
                next: async () => {
                    console.info('$socket.api (connectSocket): socket disconnected');
                    this.removeBodyClass();
                },
            },
            url: `wss://${window.location.host}/etl-socket-server`,
        });
        this.subject.subscribe({
            complete: () => console.info('Socket Closed'),
            error: (err: IntError) => this.errorHandler(err),
            next: (message: any) => this.messageHandler(message),
        });
    };

    private retry = (): void => {
        this.timeout = setTimeout(() => {
            console.info('$socket.api (recconnect): reconnecting....');
            this.connectSocket();
        }, 5000);
    };

    private stopRetry = (): void => {
        clearTimeout(this.timeout);
        this.isInRetry = false;
    };

    private errorHandler = (err: IntError): void => {
        if (err.type !== 'close') {
            this.count += 1;
            console.info(`$socket.api (errorHandler): close event - retrying nbr: ${this.count}/20`);
        }
        this.removeBodyClass();
        this.isInRetry = true;
        if (this.count > 20) {
            this.store.dispatch({
                detail: 'Live Connection could not be established',
                type: 'ERROR',
            });
        } else {
            this.retry();
        }
    };

    private setBodyClass = (): void => {
        console.info('%csockt.api (setBodyClass) => socketconn', 'color:blue');
        if (this.env) {
            this.env.nextClass('socketconn');
        }
    };

    private removeBodyClass = (): void => {
        console.info('$sockt.api (remoceBodyClass): removing class: socketconn');
        if (this.env) {
            this.env.nextClass('socketconn', true);
        }
    };
}
