import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { IntPayloadValues, IQuery } from '@models';
import { findByFilter, countByFilter } from '../job.backend/job.functions';

/**
 * @info also by gettemplate and settings
 * @input {{job: IQuery}}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const parseFilter: (job: IQuery) => any = (job: IQuery) => {
    const filter: any = {};

    if (job.org) {
        filter['project.org'] = job.org;
    }

    if (job.type) {
        filter.type = job.type;
    }

    if (job.mine) {
        filter['annotations.createdbyemail'] = job.email;
    }

    if (job.status) {
        filter['job.status'] = job.status;
    }

    if (job.scheduled) {
        filter['schedule.enabled'] = true;
    }

    if (job.search && job.reference) {
        // escape characters for mongo regex
        const ref: string = job.reference.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&');
        if (['name', 'description'].includes(job.search)) {
            filter[job.search] = { $regex: ref, $options: 'i' };
        }

        if (['status'].includes(job.search)) {
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

    if (job.tags && job.tags.length > 0) {
        filter.tags = job.tagstype === 'any' ? { $in: job.tags } : { $all: job.tags };
    }

    return filter;
};

export const jobs: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IQuery = req.body.query ? req.body.query : req.body;

    body.org = req.user.org;
    body.email = req.user.email;

    try {
        const filter: any = parseFilter(body);

        if (body.sortField) {
            body.sortField = `job.${body.sortField}`;
        }

        const d1: Promise<IntPayloadValues[]> = findByFilter(filter, body);
        const d2: Promise<number> = countByFilter(filter);

        const DBJob: [IntPayloadValues[], number] = await Promise.all([d1, d2]);

        utils.logInfo(`$jobs (jobs): email: ${req.user.email} `, req.transid, process.hrtime(hrstart));

        const rows: any[] = DBJob[0];
        const nbr: number = DBJob[1];

        if (rows.length > 0) {
            rows[0].nbr = nbr;
        }

        return Promise.resolve(rows);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $jobs (jobs)');

        return Promise.reject(err);
    }
};
