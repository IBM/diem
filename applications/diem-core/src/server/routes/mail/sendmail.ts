import { Credentials } from '@common/cfenv';
import { utils } from '@common/utils';
import sgMail from '@sendgrid/mail';
import { ClientResponse } from '@sendgrid/client/src/response';
import { addTrace } from '@functions';

export { ClientResponse };

const credentials: string = Credentials('sendgrid').api;

const unique: (myArr: any[], prop: string) => any[] = (myArr: any[], prop: string) =>
    myArr.filter(
        (obj: any, pos: number, arr: any) => arr.map((mapObj: any) => mapObj[prop]).indexOf(obj[prop]) === pos
    );

/**
 * Class SendMail with methods to sent mail
 *
 * @class SendMail
 * @function sendMail : the sendmail function
 */
class SendMail {
    public constructor() {
        sgMail.setApiKey(credentials);
    }

    /**
     * @param {IMailBody} body - the content of the mail
     * @param {string} transid - the transaction id
     * @async
     * @memberof SendMail
     * @return Promise after the mail has been send
     */
    public sendMail = async (body: any, transid: string): Promise<any> => {
        if (body.to) {
            body.to = unique(body.to, 'email');
        }

        if (body.cc) {
            body.cc = unique(body.cc, 'email');
        }

        const res: [ClientResponse, any] = await sgMail.send(body).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $mail (sendMail)');
            /** bubling up no error to be logged */

            if (err.response && err.response.body) {
                return Promise.reject({ ...err.response.body, trace: err.trace });
            }

            if (err.response) {
                return Promise.reject({ ...err.response, trace: err.trace });
            }

            return Promise.reject(err);
        });

        utils.logInfo(`$mail (sendMail): Subject: ${body.subject} - ti: ${transid}`);

        return Promise.resolve(res);
    };
}

export const sendmail: SendMail = new SendMail();
