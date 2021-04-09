import { utils } from '@common/utils';
import { IRequest, IntServerPayload } from '@interfaces';
import { DataModel, EJobStatus, IJobBody, IJobResponse, IModel } from '@models';
import { addTrace } from '@functions';
import { makemakePlPayload } from '../pipeline.backend/pipeline.dependency';

// eslint-disable-next-line sonarjs/cognitive-complexity
const actionUpdate: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    if (!body.id) {
        return Promise.reject({
            message: 'The actionUpdate is mising an id',
            name: 'Pipleine Update Request',
        });
    }

    const pipelineid: string = body.id;

    /* get the id here */

    const doc: IModel | null = await DataModel.findOne({ _id: pipelineid }).exec();

    if (doc === null) {
        return Promise.reject({
            id: pipelineid,
            message: 'The document could not be found',
            trace: ['@at $pipeline.job (actionUpdate)'],
        });
    }

    if (!doc.jobs) {
        doc.jobs = {};
    }

    if (body.records) {
        for (const record of body.records) {
            if (record.id !== undefined) {
                if (doc.jobs[record.id]) {
                    doc.jobs[record.id].from.push(pipelineid);
                } else {
                    doc.jobs[record.id] = {
                        from: [pipelineid],
                        queue: [],
                        required: 'all',
                        status: EJobStatus.pending,
                    };
                }
            }
        }
    }

    doc.set({
        annotations: {
            createdbyemail: doc.annotations.createdbyemail || body.email,
            createdbyname: doc.annotations.createdbyname || body.username,
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
    });

    try {
        return Promise.resolve(await makemakePlPayload(doc));
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $pipeline.job (actionUpdate)');

        return Promise.reject(err);
    }
};

export const pipelinejob: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IJobBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;

    const payload: IntServerPayload = await actionUpdate({ ...body }).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.pipeline (pipelinejob)');
        err.email = body.email;

        return Promise.reject(err);
    });

    utils.logInfo(
        `$job.pipeline (pipelinejob) completed pipeline update for job ${body.id}`,
        req.transid,
        process.hrtime(hrstart)
    );

    return Promise.resolve(payload);
};

export const pipelinejobs: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const body: { id: string; jobs: IJobResponse[] } = { ...req.body.query };

    if (!body.jobs) {
        return Promise.reject({
            message: 'No Jobs found',
        });
    }

    return Promise.resolve(body.jobs.filter((row: any) => row.id !== body.id));
};
