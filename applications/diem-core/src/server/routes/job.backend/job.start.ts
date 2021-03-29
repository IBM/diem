import { utils } from '@common/utils';
import { EJobStatus, IModel } from '@models';
import { addTrace } from '../shared/functions';
import { jobStartHandler } from './job.start.handler';

export const jobStart: (doc: IModel) => Promise<void> = async (doc: IModel): Promise<void> => {
    /**
     * We kick this off with making a distinction between a regular job or a batchjob
     */

    const id: string = doc._id.toString();

    // it's a job so we will create it here

    utils.logInfo(`$job.start (jobStart): new job start request - job: ${id}`, doc.job.transid);

    await jobStartHandler(
        {
            email: doc.job.email,
            executor: doc.job.executor,
            id,
            jobid: doc.job.jobid, // important if this is from an individual job or pipeline (see job.actions)
            name: doc.name,
            runby: doc.job.runby,
            status: EJobStatus.submitted, // a pipeline is running, a job is submitted
            jobstart: doc.job.jobstart,
            transid: doc.job.transid,
            org: doc.project.org,
        },
        {
            name: 'startjob',
            id,
        }
    ).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $job.start (createJob)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
