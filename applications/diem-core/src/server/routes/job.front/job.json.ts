import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { DataModel, IJobDetails, IJobModel, IJobSchema } from '@models';
import { getNodes } from './job.detail';

interface IModelPayload extends IJobModel {
    source__dropcolumns: string[];
    source__connection: string;
    source__fetchsize: number;
    createdbyemail: string;
    createdbyname: string;
    createddate: string;
    description: string;
    modifiedbyemail: string;
    modifiedbyname: string;
    modifieddate: string;
    jobend: Date;
    jobstart: string;
    schedule: any;
    status: string;
    transid: string;
    id: string;
    name: string;
    statusicon: string;
    tags: string[];
}

const getDBJobs: (jobs: IJobDetails, id: string) => Promise<[{ id: string }[], IJobModel[]]> = async (
    jobs: IJobDetails,
    id: string
): Promise<[{ id: string }[], IJobModel[]]> => {
    const nodes: { id: string }[] = [];
    const jobNodes: string[] = getNodes(jobs);

    jobNodes.forEach((node: string) => {
        nodes.push({
            id: node,
        });
    });

    let idarr: string[] = nodes.map((a: { id: string }) => a.id);

    idarr = idarr.filter((key: string) => key !== id);

    const dbjobs: IJobModel[] = await DataModel.find({ _id: { $in: idarr } })
        .sort({ name: 1 })
        .exec();

    return Promise.resolve([nodes, dbjobs]);
};

export const jobdetail_json: (req: IRequest) => Promise<IModelPayload | any> = async (
    req: IRequest
): Promise<IModelPayload | any> => {
    if (!req.body.id) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    const hrstart: any = process.hrtime();

    const doc: IJobSchema | null = await DataModel.findOne({ _id: req.body.id }).lean().exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $job.download (jobdownload)'],
        });
    }

    try {
        utils.logInfo(`$job.json (job_json) - job ${req.body.id}`, req.transid, process.hrtime(hrstart));

        doc.log = [];

        return Promise.resolve({ job_json: JSON.stringify(doc, undefined, 2) });
    } catch (err) {
        if (err.message && err.message.includes('Cast to ObjectI')) {
            return Promise.resolve({});
        }

        err.job = req.body.id;
        err.trace = addTrace(err.trace, '@at $job.json (jobdetail_json)');

        return Promise.reject(err);
    }
};

export const jobpipeline_json: (req: IRequest) => Promise<IModelPayload | any> = async (
    req: IRequest
): Promise<IModelPayload | any> => {
    if (!req.body.id) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    const hrstart: any = process.hrtime();

    const doc: IJobSchema | null = await DataModel.findOne({ _id: req.body.id }).lean().exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $job.json (jobpipeline_json)'],
        });
    }

    try {
        utils.logInfo(`$job.json (jobpipeline_json) - job ${req.body.id}`, req.transid, process.hrtime(hrstart));

        const out: any[] = [];

        doc.log = [];
        out.push(doc);

        const DBJobs: [{ id: string }[], IJobModel[]] = await getDBJobs(doc.jobs, doc._id);

        DBJobs[1].forEach((pldoc: IJobModel) => {
            const pljob: IJobSchema = pldoc.toObject();
            pljob.log = [];
            out.push(pljob);
        });

        return Promise.resolve({ job_json: JSON.stringify(out, undefined, 2) });
    } catch (err) {
        if (err.message && err.message.includes('Cast to ObjectI')) {
            return Promise.resolve({});
        }

        err.job = req.body.id;
        err.trace = addTrace(err.trace, '@at $job.json (jobpipeline_json)');

        void utils.logError(err);

        return Promise.reject(err);
    }
};
