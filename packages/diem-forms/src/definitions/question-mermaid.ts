import { QuestionBase } from './question-base';

export class MermaidQuestion extends QuestionBase<string> {
    public controlType = 'mermaid';

    public constructor(options: any = {}) {
        super(options);
    }
}
