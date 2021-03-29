/* eslint-disable @typescript-eslint/indent */
import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { stringify } from 'yaml';
import { IQuery, IWebApikeyPayload, IWebApikeysSchema, WebApikeysModel, FaIcons, EIdType } from '@models';
import { parseFilter } from '../jobs/jobs';

const viewSecurity: number = 60;
const editSecurity: number = 60;

export const getwebapikey: (selector: string) => Promise<IWebApikeysSchema> = async (
    selector: string
): Promise<IWebApikeysSchema> => {
    const doc: IWebApikeysSchema | null = await WebApikeysModel.findOne({ selector }, {}).lean().exec();

    if (doc === null) {
        return Promise.reject();
    }

    return Promise.resolve(doc);
};

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getwebapikeys: (req: IRequest) => Promise<IWebApikeyPayload[]> = async (
    req: IRequest
    // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<IWebApikeyPayload[]> => {
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

    const rows: IWebApikeysSchema[] | [] = await WebApikeysModel.find(filter, {}).sort({ selector: 1 }).lean().exec();

    utils.logInfo(
        `$webapikey (webapikey) - email: ${body.email} - org: ${body.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IWebApikeyPayload[] = [];

    rows.forEach((row: IWebApikeysSchema, i: number) => {
        const id: string = row._id;

        if (row.idtype && row.idtype === EIdType.personal && body.email !== row.owner) {
            row.webapikey = '/* redacted */';
        }

        /**
         * create a lock icon
         * - open is user and personal
         * - closed is personal but not the user
         * - no lock is functional
         */
        const lock: string | undefined =
            !row.idtype || (row.idtype && row.idtype !== EIdType.personal)
                ? undefined
                : body.email && body.email === row.owner
                ? 'fas fa-lock-open'
                : 'fas fa-lock';

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
            webapikey: row.webapikey,
            params: stringify(row.params),
        };

        if (req.user.rolenbr >= editSecurity) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
            payload[i].editicon = `${FaIcons.editicon}`;
        }
    });

    return Promise.resolve(payload);
};
