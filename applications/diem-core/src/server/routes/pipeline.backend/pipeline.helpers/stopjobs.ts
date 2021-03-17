/* eslint-disable max-len */
import { utils } from '@common/utils';
import { jobStop } from '../../job.front/job.stop';
import { IModel, DataModel, EJobTypes } from '../../models/models';
import { findAndUpdatePlJob } from './helpers';

// eslint-disable-next-line sonarjs/cognitive-complexity
export const stopJobs: (pldoc: IModel) => Promise<void> = async (pldoc: IModel): Promise<void> => {
    const plid: string = pldoc._id.toString();

    let save: boolean = false;

    for await (const [key, value] of Object.entries(pldoc.jobs)) {
        const doc: IModel | null = await DataModel.findOne({ _id: key }).exec();

        if (doc && doc.job && doc.job.status && ['Running', 'Submitted'].includes(value.status)) {
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

    /*
    // if the pipeline in itself is part of a pipeline
    if (pldoc.job.jobid !== plid) {
        const doc: IModel | null = await DataModel.findOne({ _id: pldoc.job.jobid }).exec();
        if (doc && doc.job.status !== pldoc.job.status) {
            utils.logInfo(
                `$stopJobs (stopJobs): stop jobs - pl: ${plid}- target pl: ${pldoc.job.jobid} - pl status: ${pldoc.job.status} - job status: ${doc.job.status}`
            );
            await stopJobs(doc);
        }
    }
    */

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
