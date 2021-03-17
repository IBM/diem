import { QuestionBase } from './question-base';

export interface IToggleQuestion {
    onText: string;
    offText: string;
    size: string;
    checked: boolean;
}

export class ToggleQuestion extends QuestionBase<string> {
    public controlType = 'toggle';
    public onText: string;
    public offText: string;
    public size: string;
    public checked: boolean;

    public constructor(options: any = {}) {
        super(options);

        this.onText = options.onText;
        this.offText = options.offText;
        this.size = options.size;
        this.checked = options.checked;
    }
}
