/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/indent */
import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { ConnModel, IConnSchema, IConnModel, IQuery, FaIcons, EIdType } from '@models';
import { addTrace } from '@functions';

const viewSecurity: number = 60;
const editSecurity: number = 60;

export interface IConnectionPayloadValues extends Partial<IConnModel> {
    deleteicon?: string;
    editicon?: string;
    href: string;
    id: string;
    jobid?: string;
    key?: string;
    nbr: number;
    lock?: string;
}

const parseFilter: (body: IQuery) => any = (body: IQuery) => {
    const filter: any = {};

    if (body.org) {
        filter['project.org'] = body.org;
    }

    if (body.type) {
        filter.type = body.type;
    }

    if (body.search && body.reference && body.search === 'user') {
        filter.user = { $regex: body.reference, $options: 'i' };
    }

    if (body.search && body.reference) {
        filter[body.search] = { $regex: body.reference, $options: 'i' };
    }

    return filter;
};

const findConnections: (filter: any, body: IQuery) => Promise<any> = async (filter: any, body: IQuery) => {
    try {
        const d1: IConnSchema[] = await ConnModel.find(filter)
            .collation({ locale: 'en' }) // insensitive sorting
            .skip(body.first || 0)
            .limit(body.rows || 0)
            .sort({ alias: 1 })
            .lean()
            .exec();

        const d2: any = ConnModel.countDocuments(filter);

        const dbjobs: [IConnSchema[], number] = await Promise.all([d1, d2]);

        const rows: any[] = dbjobs[0];
        const nbr: number = dbjobs[1];

        const payload: IConnectionPayloadValues[] = []; // the payload return array

        rows.forEach((row: IConnModel, i: number) => {
            if (row.idtype && row.idtype === EIdType.personal && body.email !== row.owner) {
                row.password = '/* redacted */';
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

            /* make sure the spread is at the top */
            payload[i] = {
                ...row,
                ...row.project,
                href: `/connection/${row._id}`,
                key: 'id',
                lock,
                id: row._id,
                nbr,
            };

            if (body.rolenbr && body.rolenbr >= editSecurity) {
                payload[i].deleteicon = `${FaIcons.deleteicon}`;
                payload[i].editicon = `${FaIcons.editicon}`;
            }
        });

        return Promise.resolve(payload);
    } catch (err) {
        /* error handled in connections */

        return Promise.reject(err);
    }
};

const countByFilter: (filter: any) => Promise<any> = async (filter: any) => {
    try {
        const docs: number = await ConnModel.countDocuments(filter).exec();

        return Promise.resolve(docs);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $connections (countByFilter)');
        void utils.logError('$connections (countByFilter): error', err);

        return Promise.reject(err);
    }
};

export const connections: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$connections (connections): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve({});
    }

    const body: IQuery = req.body.query ? req.body.query : req.body;

    body.org = req.user.org;
    body.rolenbr = req.user.rolenbr;
    body.email = req.user.email;

    try {
        const filter: any = parseFilter(body);

        const d1: Promise<IConnModel[]> = await findConnections(filter, body);
        const d2: Promise<number> = countByFilter(filter);

        const dbjobs: [IConnModel[], number] = await Promise.all([d1, d2]);

        utils.logInfo(`$jobs (jobs): email: ${req.user.email} `, req.transid, process.hrtime(hrstart));

        const rows: any[] = dbjobs[0];
        const nbr: number = dbjobs[1];

        if (rows.length > 0) {
            rows[0].nbr = nbr;
        }

        utils.logInfo('$connections (connections)', req.transid, process.hrtime(hrstart));

        return Promise.resolve(rows);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $connection (connections)');

        return Promise.reject(err);
    }
};

/**
 * used to find the connections within the jobs
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getconnections: (req: IRequest) => Promise<IConnModel[]> = async (
    req: IRequest
): Promise<IConnModel[]> => {
    const hrstart: [number, number] = process.hrtime();

    let docs: IConnModel[];

    try {
        docs = await ConnModel.find({ 'project.org': req.user.org })
            .collation({ locale: 'en' }) // insensitive sorting
            .distinct('alias')
            .exec();
        docs.sort();
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $connections (getconnections)');
        err.return = {};

        return Promise.reject(err);
    }

    utils.logInfo('$connections (getconnections)', req.transid, process.hrtime(hrstart));

    return Promise.resolve(docs);
};
