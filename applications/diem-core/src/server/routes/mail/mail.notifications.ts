import { utils } from '@common/utils';
import { addTrace } from '@functions';
import { mailTemplates } from './mail.options';
import { mailhandler } from './mail.handler';
import { IPreparedMail, IMailContent, IMailElements } from './mail.interfaces';

const getReceipients: any = (recipients: string | []): any[] => {
    if (Array.isArray(recipients)) {
        return recipients;
    }

    if (!recipients || recipients === '') {
        return [];
    }

    return recipients.split(', ');
};

/**
 * Sends an email
 *
 * ```ts
 * make sure the receiver [recepients] is the new owner
 * we cc the requester (sendgrid needs an array)
 * subject and html are not filled in this
 * will be done by the template```
 *
 * @function sendMAil
 * @param body {IMailContent} body
 * @return void
 */
export const sendMail: (body: IMailContent) => Promise<any> = async (body: IMailContent): Promise<any> => {
    /**
     * Here is the place where we look up the html needed for the boby of the email
     * the value comes from the mailTemplate calculate earlier in the upstream
     * If you want a custom email , you need to define it upstream
     *
     */
    const templ: IMailElements | false = mailTemplates.getTemplate(body.mailTemplate, body);

    if (!templ) {
        const err: any = {
            message: `no template for ${body.mailTemplate}`,
            name: 'notemplate',
        };

        void utils.logError('$mail.notifcations (sendMail)', err);

        return Promise.reject(err);
    }

    const mail: IPreparedMail = {
        attachments: body.attachments,
        cc: getReceipients(body.cc),
        contact: body.contact,
        html: templ.html,
        recipients: getReceipients(body.recipients),
        subject: body.subject || templ.subject,
        transid: body.transid,
    };

    await mailhandler.newMail(mail).catch(async (err: any) => {
        //bubbling up
        err.trace = addTrace(err.trace, '@at $mail.notifications (sendMail)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
