import { ConfirmationService } from 'primeng/api';
import { DynamicFormModule } from '@mydiem/diem-forms';
import { NgModule } from '@angular/core';
import { AppSharedModule } from '../../app.shared.module';
import { ModalComponent } from '../modal/modal.component';
import { DialogService } from './main.api';
import { SocketService } from './socket.api';
import { PushNotificationsService } from './notifications';

@NgModule({
    declarations: [ModalComponent],
    exports: [AppSharedModule, DynamicFormModule, ModalComponent],
    imports: [AppSharedModule, DynamicFormModule],
    providers: [ConfirmationService, DialogService, SocketService, PushNotificationsService],
})
export class MainSharedModule {}
