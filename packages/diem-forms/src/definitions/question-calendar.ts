import { QuestionBase } from './question-base';

export interface ICalendarQuestion {
    controlType: string;
    showTime: boolean;
    timeOnly: boolean;
    showIcon: boolean;
    minDate: Date;
    maxDate: Date;
    dateFormat: string;
    ngDateFormat: string;
    readonlyInput: boolean;
    placeholder: string;
}

export class CalendarQuestion extends QuestionBase<string> implements ICalendarQuestion {
    public controlType = 'calendar';
    public showTime: boolean;
    public timeOnly: boolean;
    public showIcon: boolean;
    public minDate: Date;
    public maxDate: Date;
    public dateFormat: string;
    public ngDateFormat: string;
    public readonlyInput: boolean;
    public placeholder: string;
    public invalidText: string;

    public constructor(options: any = {}) {
        super(options);

        this.showTime = !!options.showTime;
        this.timeOnly = !!options.timeOnly;
        this.showIcon = !!options.showIcon;
        this.minDate = options.minDate || undefined;
        this.maxDate = options.maxDate || undefined;
        this.dateFormat = options.dateFormat || 'dd.mm.yy';
        this.ngDateFormat = options.ngDateFormat || 'dd.mm.yy';
        this.readonlyInput = options.readonlyInput || undefined;
        this.placeholder = options.placeHolder || 'Enter Date';
        this.invalidText = options.invalidText || 'Incorrect Value';
    }
}
