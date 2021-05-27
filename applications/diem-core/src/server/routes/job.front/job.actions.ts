import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { DataModel, EJobStatus, EJobStatusCodes, EJobTypes, IBody, IETLJob, IJobModel } from '@models';
import { addTrace } from '@functions';
import { jobStart } from '../job.backend/job.start';
import { findAndUpdatePlJob, stopJobs } from '../pipeline.backend/pipeline.helpers/helpers';
import { jobStop, stopPlJob } from './job.stop';

export const jobHanldeStop: (doc: IJobModel, body: { id: string; email: string; transid: string }) => Promise<boolean> =
    async (doc: IJobModel, body: { id: string; email: string; transid: string }): Promise<boolean> => {
        const id: string = doc._id.toString();
        const isPl: boolean = doc.type === EJobTypes.pipeline;
        const isPlJob: boolean = (doc.job && doc.job.jobid && doc.job.jobid !== id) || false; // part of a pipeline
        const jobkind: string = isPl ? 'pl' : 'job';

        doc.job.status = EJobStatus.stopped;

        const job: IETLJob = {
            email: doc.job.email,
            executor: doc.job.executor,
            id,
            jobid: doc.job.jobid,
            jobstart: doc.job.jobstart,
            name: doc.name,
            runby: 'user',
            status: doc.job.status,
            transid: doc.job.transid,
            org: doc.project.org,
        };

        if (isPl) {
            utils.logInfo(
                `$job.actions (jobactions): pipeline stop request - pl: ${body.id} - email: ${body.email}`,
                body.transid
            );

            //
            await stopJobs(doc);
            await stopPlJob(job);
        } else {
            utils.logInfo(
                `$job.actions (jobactions): stop request - ${jobkind}: ${body.id} - executer: ${job.executor} - email: ${body.email}`,
                body.transid
            );

            await jobStop(job);
        }

        // if this job is part of another pipeline then update that pipeline
        if (isPlJob) {
            await findAndUpdatePlJob(doc);
        }

        //doc.markModified('job');

        await doc.save().catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $job.actions (jobactions) - stop save');
            err.id = id;

            return Promise.reject(err);
        });

        return Promise.resolve(true);
    };

export const jobactions: (req: IRequest) => Promise<boolean> = async (req: IRequest): Promise<boolean> => {
    const body: IBody = { ...req.body };
    body.transid = req.transid;
    body.email = req.user.email;

    const id: string = body.id;

    const doc: IJobModel | null = await DataModel.findOne({ _id: id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $job.actions (jobactions)'],
        });
    }

    /** there are 3 places manual, cron and api that can trigger a job */
    doc.job.transid = body.transid;
    doc.job.email = body.email;
    doc.job.runby = 'user';

    if (body.action === 'stop') {
        void jobHanldeStop(doc, body);

        return Promise.resolve(true);
    }

    doc.job.jobid = body.jobid || id;

    if (([EJobStatus.running, EJobStatus.submitted] as EJobStatusCodes[]).includes(doc.job.status)) {
        utils.logInfo(
            `$job.actions (jobactions): already running - pl: ${id} - pl status: ${doc.job.status}`,
            doc.job.transid
        );
    } else {
        await jobStart(doc).catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $job.actions (jobactions) - jonstart');
            err.id = id;

            return Promise.reject(err);
        });
    }

    return Promise.resolve(true);
};
