import { QuestionBase } from './question-base';

export interface ITooltipQuestion {
    offset?: any;
    placement: 'bottom' | 'top' | 'left' | 'right';
    isOpen: boolean;
    size: string;
    text?: string;
    style?: any;
}

export class TooltipQuestion extends QuestionBase<string> implements ITooltipQuestion {
    public controlType = 'tooltip';
    public isOpen: boolean;
    public size: string;
    public text?: string;
    public style?: any;
    public offset?: any;

    public placement: 'bottom' | 'top' | 'left' | 'right';

    public constructor(options: any = {}) {
        super(options);
        this.placement = options.placement || 'bottom';
        this.isOpen = options.isOpen || false;
        this.size = options.size || '16';
        this.text = options.text || 'Help';
        this.style = options.style;
        this.offset = options.offset;
    }
}
