import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { IQuery, JobLogModel, IJobLogModel, IJobLog } from '@models';
import { StatusConfig } from '../job.backend/job.functions';

const parseFilter: (job: IQuery) => any = (job: IQuery) => {
    const filter: any = {};

    if (job.org) {
        filter['project.org'] = job.org;
    }

    if (job.type) {
        filter.type = job.type;
    }

    if (job.mine) {
        filter.email = job.email;
    }

    if (job.status) {
        filter.status = job.status;
    }

    if (job.scheduled) {
        filter.runby = 'schedule';
    }

    if (job.search && job.reference) {
        // escape characters for mongo regex
        const ref: string = job.reference.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&');
        if (['name', 'description'].includes(job.search)) {
            filter[job.search] = { $regex: ref, $options: 'i' };
        }

        if (['status', 'jobid'].includes(job.search)) {
            filter[job.search] = job.reference;
        }

        if (job.search === 'sql') {
            filter.$or = [
                { ['config.source.sql']: { $regex: ref, $options: 'i' } },
                { ['stmt.sql']: { $regex: ref, $options: 'i' } },
                { ['custom.code']: { $regex: ref, $options: 'i' } },
            ];
        }
    }

    return filter;
};

const findByFilter: (filter: any, body: IQuery) => Promise<any> = async (filter: any, body: IQuery) => {
    try {
        // @ts-ignore TS2589
        const docs: IJobLog[] = await JobLogModel.find(filter)
            .skip(body.first || 0)
            .limit(body.rows || 0)
            .sort({ jobstart: -1 })
            .lean()
            .exec();

        return Promise.resolve(docs);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.log (findByFilter)');
        void utils.logError('$job.log (findByFilter): error', err);

        return Promise.reject(err);
    }
};

const countByFilter: (filter: any) => Promise<any> = async (filter: any) => {
    try {
        const docs: number = await JobLogModel.countDocuments(filter).exec();

        return Promise.resolve(docs);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.log (countByFilter)');
        void utils.logError('$job.log (countByFilter): error', err);

        return Promise.reject(err);
    }
};

export const joblog: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IQuery = req.body.query ? req.body.query : req.body;

    body.org = req.user.org;
    body.email = req.user.email;

    try {
        const filter: any = parseFilter(body);

        const d1: Promise<IJobLogModel[]> = findByFilter(filter, body);
        const d2: Promise<number> = countByFilter(filter);

        const dbjobs: [IJobLogModel[], number] = await Promise.all([d1, d2]);

        utils.logInfo(`$job.log (joblog): email: ${req.user.email} `, req.transid, process.hrtime(hrstart));

        const rows: IJobLog[] = dbjobs[0];
        const nbr: number = dbjobs[1];

        rows.forEach((row: IJobLog) => {
            const out: string | any[] | undefined =
                row.out && Array.isArray(row.out) && row.out.length > 0
                    ? row.out.map((obj: any) => obj.out).join('\n')
                    : undefined;

            row.nbr = nbr;
            row.statusicon = StatusConfig[row.status].statusicon || 'fa fa-question';
            row.erroricon = row.error ? 'far fa-file-code fa-lg c-red' : undefined;
            row.outicon = row.out ? 'far fa-file-code fa-lg c-green' : undefined;
            row.auditicon = row.audit ? 'far fa-file-code fa-lg' : undefined;
            row.audit = row.audit ? JSON.stringify(row.audit, undefined, 2).replace(/\\n/g, '\n') : undefined;
            row.out = out;
        });

        return Promise.resolve(rows);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.log (joblog)');

        return Promise.reject(err);
    }
};
