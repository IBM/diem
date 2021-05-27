/* eslint-disable complexity */
import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { DataModel, IJobSchema, IJobModel, IQuery } from '@models';
import { countByFilter } from '../job.backend/job.functions';
import { allPipelineIds } from '../pipeline.backend/pipeline.helpers/getallpipelinejobs';

interface IId {
    id: string;
}

interface IPipelineQuery extends IQuery {
    jobs: IId[];
}

const findByFilter: (filter: any, body: IQuery) => Promise<any> = async (filter: any, body: IQuery) => {
    const docs: IJobSchema[] = await DataModel.find(filter)
        .collation({ locale: 'en' }) // insensitive sorting
        .skip(body.first || 0)
        .limit(body.rows || 0)
        .sort({ [body.sortField || 'name']: [body.sortOrder || 1] })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.functions (findByFilter) - find');

            return Promise.reject(err);
        });

    try {
        const payload: any[] = []; // the payload return array

        docs.forEach((row: IJobSchema, i: number) => {
            /* make sure the spread is at the top */
            payload[i] = {
                description: row.description,
                id: row._id,
                name: row.name,
                type: row.type,
            };
        });

        return Promise.resolve(payload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $pipeline.inline.jobs (findByFilter)');

        return Promise.reject(err);
    }
};

/**
 * @info also by gettemplate and settings
 * @input {{job: IQuery}}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const parseFilter: (job: IPipelineQuery) => Promise<any> = async (job: IPipelineQuery) => {
    const filter: any = {};

    let excl: string[] = [];

    if (job.id) {
        excl.push(job.id);
    }

    if (job.org && job.id) {
        try {
            const plids: string[] = (await allPipelineIds(job.org, job.id)) || [];
            if (plids.length > 0) {
                excl = excl.concat(plids);
                utils.logInfo(
                    `$pipeline.inline.jobs (parseFilter): email: added ${plids.length} pipelineids for org: ${job.org}`
                );
            }
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $pipeline.inline.jobs (allPipelineIds)');

            return Promise.reject(err);
        }
    }

    try {
        if (job.jobs && job.jobs.length > 0) {
            job.jobs.forEach((ijob: IId) => {
                excl.push(ijob.id);
            });
        }

        filter._id = { $nin: excl };

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

        return Promise.resolve(filter);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $pipeline.inline.jobs (findByFilter)');

        return Promise.reject(err);
    }
};

export const pipelineinlinejobs: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IPipelineQuery = req.body.query ? req.body.query : req.body;

    body.org = req.user.org;
    body.email = req.user.email;

    if (!body.org || !body.id) {
        return Promise.reject({ message: 'must have id and org' });
    }

    try {
        const filter: any = await parseFilter(body);

        if (body.sortField) {
            body.sortField = `job.${body.sortField}`;
        }

        const d1: Promise<IJobModel[]> = findByFilter(filter, body);
        const d2: Promise<number> = countByFilter(filter);

        const dbjobs: [IJobModel[], number] = await Promise.all([d1, d2]);

        utils.logInfo(
            `$pipeline.inline.jobs (pipelineinlinejobs): email: ${req.user.email} `,
            req.transid,
            process.hrtime(hrstart)
        );

        const rows: any[] = dbjobs[0];
        const nbr: number = dbjobs[1];

        if (rows.length > 0) {
            rows[0].nbr = nbr;
        }

        return Promise.resolve(rows);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $pipeline.inline.jobs (pipelineinlinejobs)');

        return Promise.reject(err);
    }
};
