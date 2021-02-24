import { NgModule } from '@angular/core';
import { IBMBackToTopDirective } from './ibm-back-to-top.directive';
import { IBMStickyHeaderDirective } from './ibm.sticky.header.directive';

@NgModule({
    declarations: [
        IBMBackToTopDirective,
        IBMStickyHeaderDirective,
    ],
    exports: [
        IBMBackToTopDirective,
        IBMStickyHeaderDirective,
    ],
})

export class Directives { }
