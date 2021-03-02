/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/indent */
import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IQuery, ISnippetsModel, SnippetsModel, FaIcons, ISnippetPayload, EIdType } from '../models/models';
import { parseFilter } from '../jobs/jobs';

const viewSecurity: number = 5;
const editSecurity: number = 60;

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getsnippets: (req: IRequest) => Promise<ISnippetPayload[]> = async (
    req: IRequest
): Promise<ISnippetPayload[]> => {
    const hrstart: [number, number] = process.hrtime();

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$snippets (getsnippets): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve([]);
    }

    const body: IQuery = req.body.query ? req.body.query : req.body;

    body.org = req.user.org;
    body.email = req.user.email;

    const filter: any = parseFilter(body);

    const rows: ISnippetsModel[] | [] = await SnippetsModel.find(filter, {}).sort({ selector: 1 }).exec();

    utils.logInfo(
        `$snippets (snippets) - email: ${body.email} - org: ${body.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: ISnippetPayload[] = [];

    rows.forEach((row: ISnippetsModel, i: number) => {
        const id: string = row._id.toString();

        if (row.idtype && row.idtype === EIdType.personal && body.email !== row.owner) {
            row.snippet = '/* redacted */';
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
            snippetid: id,
            name: row.name,
            org: row.project.org,
            owner: row.owner,
            snippet: row.snippet,
            selector: row.selector,
            viewicon: `${FaIcons.viewicon}`,
        };

        if (req.user.rolenbr >= editSecurity) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
            payload[i].editicon = `${FaIcons.editicon}`;
        }
    });

    return Promise.resolve(payload);
};
