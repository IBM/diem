import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { stringify } from 'yaml';
import { IQuery, IConfigmapSchema, ConfigmapsModel, FaIcons, IConfigmapPayload, EIdType } from '@models';
import { getLock } from '@functions';
import { parseFilter } from '../jobs/jobs';

const viewSecurity = 60;
const editSecurity = 60;
const managerSecurity = 80;

export const getconfigmap: (selector: string) => Promise<IConfigmapSchema> = async (
    selector: string
): Promise<IConfigmapSchema> => {
    const doc: IConfigmapSchema | null = await ConfigmapsModel.findOne({ selector }, {}).lean().exec();

    if (doc === null) {
        return Promise.reject();
    }

    return Promise.resolve(doc);
};

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getconfigmaps: (req: IRequest) => Promise<IConfigmapPayload[]> = async (
    req: IRequest
): Promise<IConfigmapPayload[]> => {
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

    const rows: IConfigmapSchema[] = await ConfigmapsModel.find(filter, {}).sort({ selector: 1 }).lean().exec();

    utils.logInfo(
        `$configmaps (configmaps) - email: ${body.email} - org: ${body.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IConfigmapPayload[] = [];

    rows.forEach((row: IConfigmapSchema, i: number) => {
        const id: string = row._id;

        if (row.idtype && row.idtype === EIdType.personal && body.email !== row.owner) {
            row.configmap = { info: '/* redacted */' };
        }

        /**
         * create a lock icon
         * - open is user and personal
         * - closed is personal but not the user
         * - no lock is functional
         */
        const lock = getLock(body, row);

        payload[i] = {
            configmap: stringify(row.configmap),
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
