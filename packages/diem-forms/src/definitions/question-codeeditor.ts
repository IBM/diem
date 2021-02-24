import { QuestionBase } from './question-base';

export interface ICodeEditorQuestion {
    codetheme?: string;
    mode: string;
    readOnly?: boolean | string;
    style?: any;
    codeoptions?: any;
}

export class CodeEditorQuestion extends QuestionBase<string> {
    public controlType = 'codeeditor';
    public codetheme: string;
    public mode: string;
    public readOnly: boolean | string;
    public style?: any;
    public codeoptions?: any;

    public constructor(options: any = {}) {
        super(options);
        this.mode = options.mode;
        this.readOnly = options.readOnly;
        this.codetheme = options.codetheme;
        this.style = options.style;
        this.codeoptions = options.codeoptions;
    }
}
