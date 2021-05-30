import { IJobModel, IJob } from '@models';
import { addTrace } from '@functions';
import { utils } from '@common/utils';
import { findOneAndUpdate } from './findone';

export const finishPl: (pldoc: IJobModel) => Promise<void> = async (pldoc: IJobModel): Promise<void> => {
    const pldoc_copy: any = { ...pldoc };

    const id: string = pldoc._id.toString();

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

    await findOneAndUpdate(pldoc._id, {
        $set: {
            job: pldoc.toObject().job,
            log: pldoc.toObject().log,
        },
    }).catch(async (err: any) => {
        if (err?.name && err.name.toLowerCase().includes('versionerror')) {
            err.VersionError = true;

            utils.logRed(`$finishpipeline (finishPl) - save : version error, retrying - pl: ${id}`);

            return finishPl(pldoc_copy);
        } else {
            err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - save');
            err.id = id;

            return Promise.reject(err);
        }
    });

    return Promise.resolve();
};
