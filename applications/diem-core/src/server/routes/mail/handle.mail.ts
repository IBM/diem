/**
 * This describes the mail handling
 *
 * @remarks
 *
 * The main documentation for an API item is separated into a brief
 * "summary" section optionally followed by an `@remarks` block containing
 * additional details.
 */

/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { utils } from '@common/utils';
import { EJobStatus, IModel } from '@models';
import { fmtTime, addTrace } from '@functions';
import { sendMail } from './mail.notifications';
import { IMailMeta, IMailInput, IMailParams } from './mail.interfaces';
import { EMailTemplates } from './mail.options';

enum EDelivery {
    onerror = '0',
    onsuccess = '1',
    always = '2',
}

/**
 * This prepares the mail to be sent
 *
 * @param {IMailInput} mail
 * @returns {Promise<any>}
 */
const prepareMail: (mail: IMailInput) => Promise<any> = async (mail: IMailInput): Promise<any> => {
    const meta: IMailMeta = {
        cc: [], // there is no option for cc yet
        contact: mail.email,
        mailTemplate: '',
        recipients: mail.recipients,
    };

    let hasMail: boolean = true;

    const params: IMailParams | undefined = mail.params;
    // console.info(mail.params, Object.keys(p));

    // it's a custom template if it includes at least a subject_xxxx where xxxx is success or failure
    const mail_options: string[] = ['subject_success', 'subject_failure', 'content_success', 'content_failure'];
    if (params && mail_options.some((r: string) => Object.keys(params || []).includes(r))) {
        params.status = mail.status;
        meta.mailTemplate = EMailTemplates.JobParamsTmpl;
    } else if (mail.status === EJobStatus.completed) {
        meta.mailTemplate = EMailTemplates.JobCompleteTmpl;
    } else if (mail.status === EJobStatus.failed) {
        meta.mailTemplate = EMailTemplates.JobFailedTmpl;
    } else {
        /**
         * at this point we have checked all possibilities so anything that has left
         * should not get a mail
         */

        hasMail = false;
    }

    /**
     * no mail sending if
     * - no mail template found  or
     * - (user asked to suppress mails and mail has not to be sent always)
     */

    if (!hasMail) {
        return;
    }

    await sendMail({
        attachments: mail.attachments || [],

        /** no need to copy, this is a new request */
        cc: meta.cc || [],

        /** the person that will sent the mail */
        contact: meta.contact,

        params,

        /** then name of the tempalte */
        mailTemplate: meta.mailTemplate,

        /** the name of the owner who will get the mail */
        recipients: meta.recipients,
        subject: mail.subject,
        transid: mail.transid,

        /** the values used for the templates */
        values: mail.values,
    }).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $handle.mail (prepareMail)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};

export const handleMail: (doc: IModel) => Promise<any> = async (doc: IModel): Promise<any> => {
    const id: string = doc._id.toString();

    // a few checks if we should sent mail or not

    if (!doc.mail) {
        utils.logInfo(
            `$handle.mail (handleMail): No Mail Setting - Completed : doc: ${id} - name: ${doc.name} - ti: ${doc.job.transid}`
        );

        return Promise.resolve();
    }

    if (doc.mail && doc.mail.enabled === false) {
        utils.logInfo(
            `$handle.mail (handleMail): mail disabled - doc: ${id} - name: ${doc.name} - ti: ${doc.job.transid}`
        );

        return Promise.resolve();
    }

    // here we can now continue with the mail sending

    if (
        doc.mail &&
        /**
         * don't sent a mail if the status is failed and delivery is oly for success or
         * don't sent a mail if the status is completed and delivery is oly for success
         */
        ((doc.job.status === EJobStatus.failed && doc.mail.delivery === EDelivery.onsuccess) ||
            (doc.job.status === EJobStatus.completed && doc.mail.delivery === EDelivery.onerror))
    ) {
        utils.logInfo(
            `$handle.mail (handleMail): No Mail Set - doc: ${id} - name: ${doc.name} - ti: ${doc.job.transid}`
        );

        return Promise.resolve();
    }

    const uniq: (a: string[], b: string[]) => string[] = (a: string[], b: string[]): string[] => {
        const c: string[] = a.concat(b);

        return c.filter((item, pos) => c.indexOf(item) === pos);
    };

    const mail: IMailInput = {
        email: doc.job.email,
        status: doc.job.status,
        transid: doc.annotations.transid,
        recipients: uniq([doc.job.email], doc.mail && doc.mail.recipients ? doc.mail.recipients : []),
        values: {
            error: doc.job.error || 'Error not Available, this might be a setting in your job',
            id,
            email: doc.job.email || 'system',
            jobend: doc.job.jobend ? doc.job.jobend.toISOString() : 'N/A',
            jobstart: doc.job.jobstart ? doc.job.jobstart.toISOString() : 'N/A',
            name: doc.name,
            runby: doc.job.runby,
            runtime: doc.job.runtime ? fmtTime(doc.job.runtime) : null,
        },
        params: doc.job.params && doc.job.params.mail ? { ...doc.job.params.mail } : undefined,
    };

    await prepareMail(mail).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $handle.mail (handleMail)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
