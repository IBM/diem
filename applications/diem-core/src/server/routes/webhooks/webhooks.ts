import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IQuery, IWebhookPayload, IWebhooksSchema, WebhooksModel, FaIcons, EIdType } from '@models';
import { getLock } from '@functions';
import { parseFilter } from '../jobs/jobs';

const viewSecurity = 60;
const editSecurity = 60;
const managerSecurity = 80;

export const getwebhook: (selector: string) => Promise<IWebhooksSchema> = async (
    selector: string
): Promise<IWebhooksSchema> => {
    const doc: IWebhooksSchema | null = await WebhooksModel.findOne({ selector }, {}).lean().exec();

    if (doc === null) {
        return Promise.reject();
    }

    return Promise.resolve(doc);
};

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getwebhooks: (req: IRequest) => Promise<IWebhookPayload[]> = async (
    req: IRequest
): Promise<IWebhookPayload[]> => {
    const hrstart: [number, number] = process.hrtime();

    const role: string = req.user.role;

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$connections (connections): not allowed - email: ${req.user.email} - role: ${role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve([]);
    }

    const body: IQuery = { ...req.body };

    body.org = req.user.org;
    body.email = req.user.email;

    const filter: any = parseFilter(body);

    const rows: IWebhooksSchema[] | [] = await WebhooksModel.find(filter, {}).sort({ selector: 1 }).exec();

    utils.logInfo(
        `$webhooks (webhooks) - email: ${body.email} - org: ${body.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IWebhookPayload[] = [];

    rows.forEach((row: IWebhooksSchema, i: number) => {
        const id: string = row._id.toString();

        if (row.idtype && row.idtype === EIdType.personal && body.email !== row.owner) {
            row.webhook = '/* redacted */';
        }

        /**
         * create a lock icon
         * - open is user and personal
         * - closed is personal but not the user
         * - no lock is functional
         */
        const lock = getLock(body, row);

        payload[i] = {
            createdby: row.owner || EIdType.functional,
            createddate: row.annotations.createddate.toISOString(),
            description: row.description,
            id,
            idtype: row.idtype || EIdType.functional,
            lock,
            name: row.name,
            org: row.project.org,
            owner: row.owner,
            selector: row.selector,
            viewicon: `${FaIcons.viewicon}`,
            webhook: row.webhook,
            webhookid: row._id.toString(),
        };

        if (req.user.rolenbr >= editSecurity) {
            if (
                row.idtype !== EIdType.personal ||
                req.user.rolenbr >= managerSecurity ||
                (row.idtype === EIdType.personal && body.email === row.owner)
            ) {
                payload[i].deleteicon = `${FaIcons.deleteicon}`;
            }

            if (row.idtype !== EIdType.personal || (row.idtype === EIdType.personal && body.email === row.owner)) {
                payload[i].editicon = `${FaIcons.editicon}`;
            }
        }
    });

    return Promise.resolve(payload);
};
