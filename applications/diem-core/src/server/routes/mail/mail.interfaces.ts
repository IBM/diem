export interface IMailParams {
    subject_success: string;
    subject_failure: string;
    content_success: string;
    content_failure: string;
    status: string;
}

export interface IMailContentValues {
    error: string;
    email: string;
    name: string;
    id: string;
    jobend: string;
    jobstart: string;
    runby: string;
    runtime: string | null;
    params?: IMailParams;
}

export interface IMailMeta {
    cc?: string[];
    contact: string;
    mailTemplate: string;
    recipients: string[];
}

export interface IMailAttachment {
    content_type: string;
    data: string;
    name: string;
}

export interface IntMailBase {
    attachments: any[];
    cc: any[];
    contact: string;
    html?: string;
    params?: IMailParams;
    recipients: any[];
    transid: string;
}

export interface IntMail extends IntMailBase {
    subject?: string;
}

export interface IMailContent extends IntMail {
    mailTemplate: string;
    values: IMailContentValues;
}

export interface IMailElements {
    html: string;
    subject: string;
}

export interface IMailBody {
    attachments: any[];
    cc?: any[];
    from: string;
    html?: any;
    subject: string;
    text?: string;
    to: any[];
}

export interface IPreparedMail extends IntMailBase {
    subject: string;
}

export interface IMailInput {
    attachments?: IMailAttachment[];
    email: string;
    recipients: string[];
    status: string;
    subject?: string;
    transid: string;
    values: IMailContentValues;
    params?: IMailParams;
}
