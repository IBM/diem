import { animate, style, transition, trigger } from '@angular/animations';

export const fadeInAnimation: any =
    /** trigger name for attaching this animation to an element using the [@triggerName] syntax */
    trigger('fadeInAnimation', [

        /** route 'enter' transition */
        transition(':enter', [

            /** css styles at start of transition */
            style({ opacity: 0 }),

            /** animation and styles at end of transition */
            animate(300, style({ opacity: 1 })),
        ]),

        transition(':leave', [

            /** animation and styles at end of transition */
            animate(0, style({ opacity: 0 })),
        ]),
    ]);
