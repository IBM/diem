import { IJobModel, IJob } from '@models';
import { addTrace } from '@functions';

export const finishPl: (pldoc: IJobModel) => Promise<void> = async (pldoc: IJobModel): Promise<void> => {
    pldoc.job.jobend = new Date();

    if (pldoc.job.jobstart) {
        pldoc.job.runtime = Math.round(Math.abs(pldoc.job.jobend.getTime() - pldoc.job.jobstart.getTime()) / 1000) || 0;
    }

    const log: IJob = {
        count: pldoc.job.count ? Number(pldoc.job.count) : 0,
        email: pldoc.job.email,
        executor: pldoc.job.executor,
        jobend: pldoc.job.jobend,
        jobid: pldoc.job.jobid,
        jobstart: pldoc.job.jobstart,
        runby: pldoc.job.runby,
        runtime: pldoc.job.runtime,
        status: pldoc.job.status,
        transid: pldoc.job.transid,
        name: pldoc.name,
    };

    if (Array.isArray(pldoc.log)) {
        if (pldoc.log.length > 9) {
            pldoc.log.pop();
        }
        pldoc.log.unshift(log);
    } else {
        pldoc.log = [log];
    }

    pldoc.markModified('job');

    await pldoc.save().catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $finishpipeline (finishPl)');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
