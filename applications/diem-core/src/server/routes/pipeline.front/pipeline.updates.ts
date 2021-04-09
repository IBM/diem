import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload } from '@interfaces';
import { DataModel, IJobBody, IJobDetail, IModel, IntPayloadValues } from '@models';
import { addTrace } from '@functions';
import { getGraphLinks } from '../job.front/job.grapht';

/**
 * These are functions called from the front-end, nothing todo with the backend
 *
 * @param {*} resolve
 * @param {*} reject
 * @returns
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
const actionPlUpdate: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    if (!body.id || !body.jobid) {
        return Promise.reject({
            message: 'The actionPlUpdate is mising an id',
            trace: addTrace([], '@at $pipeline.updates - missing'),
        });
    }

    const id: string = body.id;
    const jobid: string = body.jobid;

    /* get the id here */

    const pldoc: IModel | null = await DataModel.findOne({ _id: jobid }).exec();

    if (pldoc === null || (pldoc && !pldoc.jobs)) {
        return Promise.reject({
            message: 'The document to update could not be found or has no jobs',
            trace: addTrace([], '@at $pipeline.updates - no jobs'),
            id,
            jobid,
        });
    }

    /**
     * in order to remove a doc we first
     * 1. need to find if there are upstreams (jobs that depend on this job)
     * 2. if there are downstreams (this job depends on others)
     * 3. remove the job
     * 4. assign the upstreams to the downstreams
     */

    const downstreamsjob: IJobDetail = pldoc.jobs[id];

    // what if there's no from

    if (!pldoc.jobs[id]) {
        return Promise.reject({
            message: `The pipeline document ${body.id} to update has no job with id ${id}`,
            trace: addTrace([], '@at $pipeline.updates - no jobs'),
        });
    }

    const downstreams: string[] = downstreamsjob.from;

    const upstreams: string[] = [];
    for (const [key, value] of Object.entries(pldoc.jobs)) {
        if (value.from.includes(id)) {
            upstreams.push(key);
            value.from = value.from.filter((item: string) => item !== id); // should remove the element
        }
    }

    delete pldoc.jobs[id];

    for (const uid of upstreams) {
        pldoc.jobs[uid].from = pldoc.jobs[uid].from.concat(downstreams);
    }

    pldoc.set({
        annotations: {
            createdbyemail: pldoc.annotations.createdbyemail || body.email,
            createdbyname: pldoc.annotations.createdbyname || body.username,
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
    });

    pldoc.markModified('jobs');

    await pldoc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $pipeline.updates - save pipeline');

        return Promise.reject(err);
    });

    const doc: IModel | null = await DataModel.findOne({ _id: id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            trace: addTrace([], '@at $pipeline.updates (actionPlUpdate) - no doc'),
            id,
            jobid,
        });
    }

    if (doc.job.jobid && doc.job.jobid !== id) {
        doc.job.jobid = id;

        await doc.save().catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $pipeline.updates (actionUpdate) - save doc');

            return Promise.reject(err);
        });
    }

    const values: any = {
        chart: {
            links: [],
            nodes: [],
        },
        jobs: [],
    };

    if (pldoc.jobs && Object.keys(pldoc.jobs).length > 0) {
        const jobs: [string?, string?, IntPayloadValues[]?] = await getGraphLinks(pldoc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $pipeline.updates (getGraphLinks)');

            return Promise.reject(err);
        });

        values.graph = jobs[0];
        values.gantt = jobs[1];
        values.jobs = jobs[2];
    }

    const payload: IntPayload[] = [
        {
            loaded: true,
            store: 'jobdetail.store',
            targetid: jobid,
            type: EStoreActions.UPD_STORE_FORM_RCD,
            values,
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Pipeline Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const jobpipelineupdates: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IJobBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;

    const payload: IntServerPayload = await actionPlUpdate({ ...body }).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at pipeline.updates (jobpipelineupdates)');
        err.email = body.email;

        return Promise.reject(err);
    });

    utils.logInfo(
        `$pipeline.updates (jobpipelineupdates) completed pipeline update for job ${body.id}`,
        req.transid,
        process.hrtime(hrstart)
    );

    return Promise.resolve(payload);
};
