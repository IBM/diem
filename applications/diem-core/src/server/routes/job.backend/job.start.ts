import { utils } from '@common/utils';
import { IJobModel } from '@models';
import { addTrace } from '@functions';
import { jobStartHandler } from './job.start.handler';

export const jobStart: (doc: IJobModel) => Promise<void> = async (doc: IJobModel): Promise<void> => {
    /**
     * We kick this off with making a distinction between a regular job or a batchjob
     */

    const id: string = doc._id.toString();

    // it's a job so we will create it here

    utils.logInfo(`$job.start (jobStart): new job start request - job: ${id}`, doc.job.transid);

    await jobStartHandler(doc).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $job.start (createJob)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
