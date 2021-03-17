/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/indent */
import { utils } from '@common/utils';
import { EJobStatus } from '../models/models';
import { IMailContentValues, IMailContent, IMailElements } from './mail.interfaces';

export enum EMailTemplates {
    JobCompleteTmpl = 'JobCompleteTmpl',
    JobParamsTmpl = 'JobParamsTmpl',
    JobFailedTmpl = 'JobFailedTmpl',
}

interface IRawParams {
    JobCompleteTmpl: (mailContent: IMailContent) => IMailElements;
    JobParamsTmpl: (mailContent: IMailContent) => IMailElements;
    JobFailedTmpl: (mailContent: IMailContent) => IMailElements;
    getTemplate: (template: string, mailContent: IMailContent) => IMailElements | false;
}

class MailTemplates implements IRawParams {
    [k: string]: any;

    private header: string = `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                            <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <meta name="format-detection" content="date=no">
                            <meta name="format-detection" content="address=no">
                            <meta name="format-detection" content="telephone=no">
                            </head>
                            <body>
                            `;

    private closing: string = `
                            <hr/>
                            <br/>
                            <div>This email was sent by an automated mail agent on behalf of the user.</div>
                            <br/>
                            <br/>
                            </body>
                            </html>
                            `;

    private url: string = `https://${utils.Env.K8_APPURLSHORT}${utils.Env.apppath}/jobdetail`;

    public getTemplate: (template: string, mailContent: IMailContent) => IMailElements | false = (
        template: string,
        mailContent: IMailContent
    ): IMailElements | false => {
        if (!this[template]) {
            return false;
        }

        return this[template](mailContent);
    };

    public JobCompleteTmpl: (mailContent: IMailContent) => IMailElements = (
        mailContent: IMailContent
    ): IMailElements => {
        const body: string = this.mailBody(mailContent.values);

        return {
            html: `${this.header}
            <p>Your Job: <b>${mailContent.values.name}</b> has completed</p>
            ${body}
            ${this.closing}`,
            subject: ` ☝ ETL Job - Completed - Job: ${mailContent.values.name}`,
        };
    };

    public JobFailedTmpl: (mailContent: IMailContent) => IMailElements = (mailContent: IMailContent): IMailElements => {
        const body: string = this.mailBody(mailContent.values);

        return {
            html: `${this.header}
                <p>Your Job: <b>${mailContent.values.name}</b> has failed</p>
                ${body}
                <p>Reported Error Log:</p>
                <div style='padding: 15px;margin:15px; border: 1px solid #c8d2d2;background:#dfe9e9;border-radius: 10px;font-size:11px;word-break:break-word'>${mailContent.values.error}</div>
                ${this.closing}`,
            subject: ` ☝ ETL Job - Failure - Job: ${mailContent.values.name}`,
        };
    };

    /**
     * this is a custom template , body is completely driven from custom html
     *
     * @field html: mailContent.html
     */
    public JobParamsTmpl: (mailContent: IMailContent) => IMailElements = (mailContent: IMailContent): IMailElements => {
        const mail: { html: string; subject: string } = { html: '', subject: '' };

        if (!mailContent.params) {
            return mail;
        }

        if (mailContent.params.status === EJobStatus.completed) {
            if (mailContent.params.subject_success) {
                mail.subject = mailContent.params.subject_success;
            }
            if (mailContent.params.content_success) {
                mail.html = mailContent.params.content_success;
            }
        } else if (mailContent.params.status === EJobStatus.failed) {
            if (mailContent.params.subject_failure) {
                mail.subject = mailContent.params.subject_failure;
            }
            if (mailContent.params.content_failure) {
                mail.html = mailContent.params.content_failure;
            }
        }

        return mail;
    };

    private mailBody: (values: IMailContentValues) => string = (values: IMailContentValues) => {
        const href: string = `${this.url}/${values.id}`;

        return `
            <div style='padding: 15px;margin:15px;border: 1px solid #c8d2d2;background:#dfe9e9;border-radius: 10px;'>
            Id: ${values.id}</br>
            Started: ${values.jobstart}</br>
            Ended: ${values.jobend}</br>
            Runtime: ${values.runtime || 0}</br>
            Email: ${values.email}</br>
            Run by: ${values.runby}</br>
            </div>
            <br/>
            Link to the job details: <strong><a target="_blank" href="${href}" rel="noreferrer">${
            values.id
        }</a></strong>
            <br/>
                `;
    };
}

export const mailTemplates: MailTemplates = new MailTemplates();
