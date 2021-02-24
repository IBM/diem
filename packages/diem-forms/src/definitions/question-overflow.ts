import { QuestionBase } from './question-base';

interface IButton {
    action: () => any;
    iconClass?: string;
    iconStyle?: string;
    typeClass?: string;
}

export interface IOverflowQuestion {
    offset?: any;
    buttons: IButton[];
    placement: 'bottom' | 'top' | 'left' | 'right';
    flip?: boolean;
    open?: boolean;
}

export class OverflowQuestion extends QuestionBase<string> {
    public controlType = 'overflow';
    public offset?: any;
    public buttons: IButton[];
    public flip?: boolean;
    public open?: boolean;
    public placement?: 'bottom' | 'top' | 'left' | 'right';

    public constructor(options: any = {}) {
        super(options);
        this.offset = options.offset;
        this.buttons = options.buttons || [];
        this.flip = options.flip || false;
        this.open = options.open || false;
        this.placement = options.placement || 'bottom';
    }
}
