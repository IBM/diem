/* eslint-disable max-len */
import { utils } from '@common/utils';
import { IJobModel, DataModel, EJobTypes, EJobStatusCodes, EJobStatus } from '@models';
import { jobStop } from '../../job.front/job.stop';
import { findAndUpdatePlJob } from './helpers';

// eslint-disable-next-line sonarjs/cognitive-complexity
export const stopJobs: (pldoc: IJobModel) => Promise<void> = async (pldoc: IJobModel): Promise<void> => {
    const plid: string = pldoc._id.toString();

    let save: boolean = false;

    for await (const [key, value] of Object.entries(pldoc.jobs)) {
        const doc: IJobModel | null = await DataModel.findOne({ _id: key }).exec();

        if (
            doc &&
            doc.job &&
            doc.job.status &&
            ([EJobStatus.running, EJobStatus.submitted] as EJobStatusCodes[]).includes(value.status)
        ) {
            utils.logInfo(
                `$stopJobs (stopJobs): stopping job - pl: ${doc.job.jobid} - job: ${key} - status: ${value.status} - executor: ${doc.job.executor}`
            );

            await jobStop({
                email: doc.job.email,
                executor: doc.job.executor,
                id: key,
                jobid: doc.job.jobid,
                name: doc.name,
                runby: 'user',
                status: pldoc.job.status,
                jobstart: doc.job.jobstart,
                transid: pldoc.job.transid,
                org: doc.project.org,
            });

            const isPlJob: boolean = (doc.job && doc.job.jobid && doc.job.jobid !== key) || false; // part of a pipeline
            // save the doc and let's start running stuff
            if (isPlJob) {
                await findAndUpdatePlJob(doc);
            }

            if (doc.type === EJobTypes.pipeline) {
                utils.logInfo(`$stopJobs (stopJobs): stop pipeline jobs - pl: ${doc.job.jobid} - job: ${key}`);
                await stopJobs(doc);
            }

            pldoc.jobs[key].status = pldoc.job.status;

            save = true;
        }
    }

    if (save) {
        pldoc.markModified('jobs');

        await pldoc.save().catch(async (err: any) => {
            err.trace = ['@t $stopJobs (stopJobs)'];
            void utils.logError(`$stopJobs (stopJobs): save failed - doc: ${plid}`, err);

            return Promise.reject(err);
        });
    }

    return Promise.resolve();
};
