import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { IModalOptions } from '@mydiem/diem-forms';

@Injectable()
export class DialogService {
    public dialog$: Observable<IModalOptions>;
    public isOpen = false;

    private dialogSource = new Subject<IModalOptions>();

    public constructor() {
        this.dialog$ = this.dialogSource.asObservable();
    }

    /**
     * Show modal api, passes the message to the modal component
     *
     * @param {IModalOptions} options
     * @memberof DialogService
     */
    public showModal(options: IModalOptions): void {
        console.info('$main.api.component (showmodal): request to open modal');
        this.dialogSource.next(options);
    }

    public closeModal(): void {
        console.info('$main.api.component (showmodal): request to close modal');
        this.dialogSource.next({ close: true });
    }
}
