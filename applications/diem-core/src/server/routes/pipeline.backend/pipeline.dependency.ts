import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload } from '@interfaces';
import { DataModel, IModel, IntPayloadValues } from '@models';
import { addTrace } from '@functions';
import { getGraphLinks } from '../job.front/job.grapht';

interface IDependencyBody {
    id: string;
    jobid: string;
    records?: any[];
    completed: boolean;
    email: string;
    username: string;
    transid: string;
    root?: boolean; // optional is true in case we have to reset as a root job
    reset?: boolean; // optional is true in case we have to reset all jobs
}

export const makemakePlPayload: (doc: IModel) => Promise<IntServerPayload> = async (
    doc: IModel
): Promise<IntServerPayload> => {
    doc.markModified('jobs');

    await doc.save().catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $pipeline.job (makemakePlPayload) - save');

        return Promise.reject(err);
    });

    const actions: any[] = [
        {
            target: 'jobdetail.general.form',
            targetid: doc.id,
            type: 'read',
        },
    ];

    const DBJobs: [string?, string?, IntPayloadValues[]?] = await getGraphLinks(doc).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.detail (makePayload)');

        return Promise.reject(err);
    });

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: 'jobdetail.store' /** not used as forcestore is enabled */,
            targetid: doc.id,
            type: EStoreActions.UPD_STORE_FORM_RCD,
            values: {
                graph: DBJobs[0],
                gantt: DBJobs[1],
                jobs: DBJobs[2],
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        actions,
        message: 'Job Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

const pipelineDependencyUpdate: (body: IDependencyBody) => Promise<IntServerPayload> = async (
    body: IDependencyBody
): Promise<IntServerPayload> => {
    const id: string = body.id;
    const jobid: string = body.jobid;

    /* get the id here */

    const doc: IModel | null = await DataModel.findOne({ _id: jobid }).exec();

    if (doc === null) {
        return Promise.reject({
            id: jobid,
            message: 'The document to update could not be found',
            trace: ['@at $pipeline.job (dependencyUpdate)'],
        });
    }

    /**
     * let's first find all the documents that will the source/ parent of this job
     */

    doc.jobs[id].from = [];

    // root is a value that will put this job back to root
    if (body.root) {
        doc.jobs[id].from = [body.jobid];
    } else if (body.records) {
        for (const job of body.records) {
            doc.jobs[id].from.push(job.id);
        }
    }

    // root is a value that will put this job back to root
    if (body.reset) {
        for (const [key, value] of Object.entries(doc.jobs)) {
            if (value && value.from) {
                doc.jobs[key].from = [body.jobid];
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
        return Promise.resolve(await makemakePlPayload(doc)); // attention job
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $pipeline.job (dependencyUpdate)');

        return Promise.reject(err);
    }
};

export const pipelinedependency: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IDependencyBody = { ...req.body };

    if (!body.id || !body.jobid) {
        return Promise.reject({
            message: 'The pipelinedependency is missing id',
            name: 'Dependency Update Request',
        });
    }

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;

    const payload: IntServerPayload = await pipelineDependencyUpdate(body).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.pipeline (pipeleinedependency)');
        err.email = body.email;

        return Promise.reject(err);
    });

    utils.logInfo(
        `$job.pipeline (pipeleinedependency) completed dependency Update for job ${body.id}`,
        req.transid,
        process.hrtime(hrstart)
    );

    return Promise.resolve(payload);
};
