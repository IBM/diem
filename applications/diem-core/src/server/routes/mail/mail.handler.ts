import { utils } from '@common/utils';
import { addTrace } from '../shared/functions';
import { ClientResponse, sendmail } from './sendmail';
import { IMailBody, IMailAttachment, IPreparedMail } from './mail.interfaces';

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
    public newMail = async (mail: IPreparedMail): Promise<any> => {
        if (mail.cc) {
            mail.cc = this.difference(mail.cc, mail.recipients);
        }

        const body: IMailBody = {
            attachments: this.makeAttachments(mail.attachments || []),
            cc: this.makeRecipients(mail.cc || []),
            from: 'cloudsup@us.ibm.com',
            html: mail.html,
            subject: mail.subject,
            to: this.makeRecipients(mail.recipients),
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

    private makeAttachments = (attachements: IMailAttachment[]): any => {
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

    private difference = (cc: string[], to: string[]): string[] =>
        cc.filter((element: string) => !to.includes(element));

    private makeRecipients: (input: any[]) => any[] = (input: any[]): any[] => {
        if (input.length === 0) {
            return [];
        }

        return input.map((email: string) => ({ email }));
    };
}

export const mailhandler: MailHandler = new MailHandler();
