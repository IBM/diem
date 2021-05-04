/* eslint-disable sonarjs/cognitive-complexity */
import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IModel } from '@models';
import { findOne } from './findone';

export const checkPlCompleted: (job: IJobResponse, plid: string) => Promise<[boolean, boolean, boolean]> = async (
    job: IJobResponse,
    plid: string
): Promise<[boolean, boolean, boolean]> => {
    const pldoc: IModel | null = await findOne(plid);

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

    const incomplete: boolean = Object.values(pldoc.jobs).some((obj: any) =>
        [EJobStatus.submitted, EJobStatus.running].includes(obj.status)
    );

    const isfailed: boolean = Object.values(pldoc.jobs).some((obj: any) => [EJobStatus.failed].includes(obj.status));

    const isstopped: boolean = Object.values(pldoc.jobs).some((obj: any) => [EJobStatus.stopped].includes(obj.status));

    utils.logInfo(
        // eslint-disable-next-line max-len
        `$checkplcompleted (checkPlCompleted): incomplete: ${incomplete} - stopped: ${isstopped} - failed: ${isfailed} - pl: ${pldoc._id.toString()} - job: ${
            job.id
        }`,
        job.transid
    );

    return Promise.resolve([incomplete, isfailed, isstopped]);
};
