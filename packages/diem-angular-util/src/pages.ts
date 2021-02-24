import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppErrorComponent } from './apperror/apperror.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { NotFoundComponent } from './notfound/notfound.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';

@NgModule({
    imports: [CommonModule],
    declarations: [AppErrorComponent, ForbiddenComponent, NotFoundComponent, UnauthorizedComponent],
    exports: [AppErrorComponent, ForbiddenComponent, NotFoundComponent, UnauthorizedComponent],
})
export class AppPages {}
export { AppErrorComponent, ForbiddenComponent, NotFoundComponent, UnauthorizedComponent };
