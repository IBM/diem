import { QuestionBase } from './question-base';

export interface IUploadQuestion {
    oldFilesQuestion?: string;
    multiple?: boolean;
    maxFileSize?: number;
    iconClass?: string;
    filesQuestion?: string;
    deletedFilesQuestion?: string;
}

export class UploadQuestion extends QuestionBase<string> {
    public controlType = 'upload';
    public maxFileSize: number;
    public multiple: boolean;
    public deletedFilesQuestion: string;
    public filesQuestion: string;
    public oldFilesQuestion?: string;
    public iconClass: string;

    public constructor(options: any = {}) {
        super(options);
        this.multiple = options.multiple || false;
        this.maxFileSize = options.maxFileSize;
        this.deletedFilesQuestion = options.deletedFilesQuestion;
        this.filesQuestion = options.filesQuestion;
        this.iconClass = options.iconClass;
        this.oldFilesQuestion = options.oldFilesQuestion;
    }
}
