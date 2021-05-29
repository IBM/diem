/* eslint-disable max-len */
import { utils } from '@common/utils';
import { pubSub } from '@config/pubsub';
import { IJobModel, DataModel, EJobTypes, EJobStatusCodes, EJobStatus, IJobResponse } from '@models';
import { finishJob } from '../../job.backend/job.finish';
import { jobStop } from '../../job.front/job.stop';

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
                `$stopJobs (stopJobs): passing to jobStop - pl: ${doc.job.jobid} - job: ${key} - status: ${value.status} - executor: ${doc.job.executor}`
            );

            void jobStop({
                email: doc.job.email,
                executor: doc.job.executor,
                id: key,
                jobid: doc.job.jobid,
                name: doc.name,
                runby: 'user',
                status: pldoc.job.status,
                jobstart: doc.job.jobstart,
                jobend: new Date(),
                transid: pldoc.job.transid,
                org: doc.project.org,
            });

            if (doc.type === EJobTypes.pipeline) {
                utils.logInfo(`$stopJobs (stopJobs): passing to jobStop - pl: ${doc.job.jobid} - job: ${key}`);
                void stopJobs(doc);
            }

            pldoc.jobs[key].status = pldoc.job.status;

            save = true;
        }
    }

    if (save) {
        pldoc.markModified('jobs');

        utils.logInfo(`$stopJobs (stopJobs): saving - pl: ${plid} - job: ${pldoc.job.status}`);

        await finishJob(pldoc).catch(async (err: any) => {
            err.trace = ['@t $stopJobs (stopJobs)'];
            void utils.logError(`$stopJobs (stopJobs): save failed - doc: ${plid}`, err);

            return Promise.reject(err);
        });

        const job: IJobResponse = {
            ...pldoc.toObject().job,
            org: pldoc.project.org,
            id: plid,
        };

        await pubSub.publish(job);
    }

    return Promise.resolve();
};
