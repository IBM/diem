import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IJobModel } from '@models';
import { findOne } from './findone';

export const checkPlCompleted: (job: IJobResponse, plid: string) => Promise<[boolean, boolean, boolean]> = async (
    job: IJobResponse,
    plid: string
): Promise<[boolean, boolean, boolean]> => {
    const pldoc: IJobModel | null = await findOne(plid);

    if (pldoc === null) {
        return Promise.reject({
            trace: ['@at $job.handler (checkPlCompleted - no doc'],
            message: 'no pipeline document',
            plid,
        });
    }

    if (pldoc.job.status === EJobStatus.completed) {
        utils.logInfo(
            `$job.handler (checkPlCompleted): pipeline already in status Completed - pl: ${plid} - job: ${job.id}`,
            job.transid
        );

        return Promise.resolve([true, true, true]);
    }

    // incomplete = true if some jobs are still running
    const incomplete: boolean = Object.values(pldoc.jobs).some((obj: any) =>
        [EJobStatus.submitted, EJobStatus.running].includes(obj.status)
    );

    const isfailed: boolean = Object.values(pldoc.jobs).some((obj: any) => [EJobStatus.failed].includes(obj.status));

    const isstopped: boolean = Object.values(pldoc.jobs).some((obj: any) => [EJobStatus.stopped].includes(obj.status));

    utils.logInfo(
        `$checkplcompleted (checkPlCompleted): incomplete: ${incomplete} - stopped: ${isstopped} - failed: ${isfailed} - pl: ${pldoc._id.toString()} - job: ${
            job.id
        }`,
        job.transid
    );

    return Promise.resolve([incomplete, isfailed, isstopped]);
};
