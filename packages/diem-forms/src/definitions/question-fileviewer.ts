import { QuestionBase } from './question-base';

export class FileViewerQuestion extends QuestionBase<string> {
    public controlType = 'fileViewer';
    public deletedFilesQuestion?: string;
    public oldFilesQuestion?: string;
    public filesQuestion?: string;
    public iconClass?: string;

    public constructor(options: any = {}) {
        super(options);
        this.iconClass = options.iconClass;
        this.deletedFilesQuestion = options.deletedFilesQuestion;
        this.filesQuestion = options.filesQuestion;
        this.oldFilesQuestion = options.oldFilesQuestion;
    }
}
