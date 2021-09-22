import { getConfigmap } from './handle.configmaps';

export const handleMail: (code: string, mail_params: any, org: string, configmap?: string) => Promise<string> = async (
    code: string,
    mail_params: any,
    org: string,
    configmap?: string
): Promise<string> => {
    let api_key: string = '';

    let mail_options: string = '';

    let doc;

    if (configmap) {
        doc = await getConfigmap(configmap, org);
    } else {
        // api_key = Credentials('sendgrid').api;
        doc = await getConfigmap('sendgrid', 'sysadmin');
    }

    if (doc && doc.configmap && doc.configmap.api_key) {
        api_key = doc.configmap.api_key;
    }

    if (mail_params.content) {
        mail_options += `mail_content = '${mail_params.content}'\n`;
    }

    if (mail_params.subject) {
        mail_options += `mail_subject = '${mail_params.subject}'\n`;
    }

    if (mail_params.filename) {
        mail_options += `mail_filename = '${mail_params.filename}'\n`;
    }

    if (mail_params.sender) {
        mail_options += `mail_sender = ${mail_params.sender}\n`;
    }

    if (mail_params.to) {
        if (Array.isArray(mail_params.to)) {
            mail_options += `mail_to = [${mail_params.to.join(',')}]\n`;
        } else {
            mail_options += `mail_to = '${mail_params.to}'\n`;
        }
    }

    const mail_code = String.raw`### handle.mail (handleMail) ###

from diemlib.mailhandler import mailhandler

config.api_key = '${api_key}'
${mail_options}

###__CODE__###`;

    return Promise.resolve(`${code.replace('###__CODE__###', mail_code)}`);
};
