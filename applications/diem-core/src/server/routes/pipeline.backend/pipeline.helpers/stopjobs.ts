import { utils } from '@common/utils';
import { IJobModel, DataModel, EJobTypes, EJobStatusCodes, EJobStatus } from '@models';
import { jobStop } from '../../job.front/job.stop';

export const stopJobs: (pldoc: IJobModel) => Promise<void> = async (pldoc: IJobModel): Promise<void> => {
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
                utils.logInfo(`$stopJobs (stopJobs): passing to stopJobs - pl: ${doc.job.jobid} - job: ${key}`);
                void stopJobs(doc);
            }
        }
    }

    return Promise.resolve();
};
