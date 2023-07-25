import { animate, style, state, transition, trigger } from '@angular/animations';

export const toastAnimation: any =
    /** trigger name for attaching this animation to an element using the [@triggerName] syntax */
    trigger('messageState', [
        state(
            'visible',
            style({
                transform: 'translateY(0)',
                opacity: 1,
            }),
        ),
        transition('void => *', [style({ transform: 'translateY(100%)', opacity: 0 }), animate('300ms ease-out')]),
        transition('* => void', [
            animate(
                '250ms ease-in',
                style({
                    height: 0,
                    opacity: 0,
                    transform: 'translateY(-100%)',
                }),
            ),
        ]),
    ]);
