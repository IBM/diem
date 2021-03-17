import { QuestionBase } from './question-base';

export class EditorQuestion extends QuestionBase<string> {
    public controlType = 'editor';
    public maxFileSize?: number;
    public multiple?: boolean;
    public deletedFilesQuestion?: string;
    public filesQuestion?: string;
    public oldFilesQuestion?: string;
    public baseurl?: string;
    public theme?: string;
    public height?: number;

    public constructor(options: any = {}) {
        super(options);
        this.multiple = options.multiple || false;
        this.maxFileSize = options.maxFileSize;
        this.deletedFilesQuestion = options.deletedFilesQuestion;
        this.filesQuestion = options.filesQuestion;
        this.oldFilesQuestion = options.oldFilesQuestion;
        this.baseurl = options.baseurl;
        this.theme = options.theme;
        this.height = options.height;
    }
}
