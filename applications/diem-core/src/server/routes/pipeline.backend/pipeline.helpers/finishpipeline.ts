import { utils } from '@common/utils';
import { IModel, IJob, IJobResponse } from '@models';

export const finishPl: (job: IJobResponse, pldoc: IModel) => Promise<void> = async (
    job: IJobResponse,
    pldoc: IModel
): Promise<void> => {
    pldoc.job.jobend = new Date();

    if (pldoc.job.jobstart) {
        pldoc.job.runtime = Math.round(Math.abs(pldoc.job.jobend.getTime() - pldoc.job.jobstart.getTime()) / 1000) || 0;
    }

    const log: IJob = {
        count: job.count ? Number(job.count) : 0,
        email: job.email,
        executor: job.executor,
        jobend: pldoc.job.jobend,
        jobid: job.jobid,
        jobstart: pldoc.job.jobstart,
        runby: pldoc.job.runby,
        runtime: pldoc.job.runtime,
        status: pldoc.job.status,
        transid: job.transid,
        name: job.name,
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

    await pldoc
        .save()
        .catch(async (err: any) =>
            utils.logError(`$finishpl (finishPl): save failed - doc: ${pldoc._id.toString()}`, err)
        );

    return Promise.resolve();
};
