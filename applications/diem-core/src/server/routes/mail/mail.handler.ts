import { utils } from '@common/utils';
import { addTrace } from '@functions';
import { ClientResponse, sendmail } from './sendmail';
import { IMailBody, IMailAttachment, IPreparedMail } from './mail.interfaces';

const makeAttachments = (attachements: IMailAttachment[]): any => {
    if (attachements.length === 0) {
        return [];
    }

    attachements.forEach((attachement: IMailAttachment) => {
        if (attachement.content_type === 'message/rfc822') {
            attachement.content_type = 'text/plain';
        }
    });

    return attachements.map((attachement: IMailAttachment) => ({
        content: Buffer.from(attachement.data).toString('base64'),
        disposition: 'attachment',
        filename: attachement.name,
        type: attachement.content_type,
    }));
};

const difference = (cc: string[], to: string[]): string[] => {
    // map all to lowercase
    const c: string[] = to.map((name) => name.toLowerCase());

    return cc.filter((element: string) => !c.includes(element.toLowerCase()));
};

const makeRecipients: (input: any[]) => any[] = (input: any[]): any[] => {
    if (input.length === 0) {
        return [];
    }

    return input.map((email: string) => ({ email }));
};

/**
 * This is the main base class to handle mail
 *
 * @export
 * @class MailHandler
 */
export class MailHandler {
    public constructor() {
        /** */
    }

    /**
     * Sends the mail
     *
     * @function newMail
     * @param {IMail} mail
     */
    // eslint-disable-next-line class-methods-use-this
    public newMail = async (mail: IPreparedMail): Promise<any> => {
        if (mail.cc) {
            mail.cc = difference(mail.cc, mail.recipients);
        }

        const body: IMailBody = {
            attachments: makeAttachments(mail.attachments || []),
            cc: makeRecipients(mail.cc || []),
            from: sendmail.userid,
            html: mail.html,
            subject: mail.subject,
            to: makeRecipients(mail.recipients),
        };

        await sendmail
            .sendMail({ ...body }, mail.transid)
            .then(async (resp: [ClientResponse, any]) => {
                const updatedform: any = {
                    event: 'mail confirmation',
                    message: resp[0].body,
                    status: resp[0].statusCode,
                    time: utils.time(),
                };

                return Promise.resolve(updatedform);
            })
            .catch(async (err) => {
                // bubble up
                err.trace = addTrace(err.trace, '@at $mailhanlder (newMail)');
                err.body = body;
                err.transid = mail.transid;

                return Promise.reject(err);
            });
    };
}

export const mailhandler: MailHandler = new MailHandler();
