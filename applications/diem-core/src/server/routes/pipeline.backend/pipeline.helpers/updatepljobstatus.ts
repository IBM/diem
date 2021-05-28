/* eslint-disable max-len */
import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { addTrace } from '@functions';
import { EJobStatus, IJobModel } from '@models';
import { findOne, findOneAndUpdate } from './findone';
import { getNodesFromId } from './helpers';

export const updatePlJobStatus: (pldoc: IJobModel, job: { id: string; status: string }) => Promise<IJobModel> = async (
    pldoc: IJobModel,
    job: { id: string; status: string }
): Promise<IJobModel> => {
    if (pldoc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            trace: addTrace([], '@at $updatepljobstatus (updatePlJobStatus) - no doc'),
        });
    }

    const plid: string = pldoc._id.toString();

    if (pldoc.jobs[job.id] && pldoc.jobs[job.id].status !== job.status) {
        const f: string = `jobs.${job.id}.status`;

        const oldStatus: string = pldoc.jobs[job.id].status;

        /* the boolean nodes means we in addition to updating the status we also need to update the
         * queue of that job for that pipeline
         */

        const nodeIds: string[] = await getNodesFromId(job.id, pldoc);

        if (nodeIds && nodeIds.length && job.status === EJobStatus.completed) {
            const nodes: any = {};
            for await (const nodeId of nodeIds) {
                if (pldoc.jobs[nodeId] && pldoc.jobs[nodeId].queue && !pldoc.jobs[nodeId].queue.includes(job.id)) {
                    nodes[`jobs.${nodeId}.queue`] = job.id;
                }
            }

            pldoc = await findOneAndUpdate(plid, {
                $set: { [f]: job.status },
                $push: nodes,
            }).catch(async (err: any) => {
                err.trace = ['@at $authorization (login-email)'];
                void utils.logError(
                    `$updatepljobstatus (updatePlJobStatus): save failed - pl: ${plid} - job: ${job.id}`,
                    err
                );

                return Promise.reject(err);
            });
        } else {
            pldoc = await findOneAndUpdate(plid, { $set: { [f]: job.status } }).catch(async (err: any) => {
                err.trace = ['@at $authorization (login-email)'];
                void utils.logError(
                    `$updatepljobstatus (updatePlJobStatus): save failed - pl: ${plid} - job: ${job.id}`,
                    err
                );

                return Promise.reject(err);
            });
        }

        if (pldoc === null) {
            return Promise.reject({
                message: 'The document to update could not be found',
                trace: addTrace([], '@at $updatepljobstatus (findOneAndUpdate) - no doc'),
            });
        }

        utils.logInfo(
            `$updatepljobstatus (updatePlJobStatus): updated pipeline job status - pl: ${plid} - doc: ${
                job.id
            } - old: ${oldStatus} - new: ${job.status} - check: ${pldoc.jobs[job.id].status} - nodes: ${nodeIds.length}`
        );

        return Promise.resolve(pldoc);
    }

    utils.logInfo(
        `$updatepljobstatus (updatePlJobStatus): status update not needed - pl: ${plid} - job: ${job.id} - status: ${job.status}`
    );

    return Promise.resolve(pldoc);
};

export const findAndUpdatePlJob: (doc: IJobModel) => Promise<void> = async (doc: IJobModel): Promise<void> => {
    const id: string = doc._id.toString();

    if (!doc.job || (doc.job && !doc.job.jobid)) {
        return Promise.reject({
            trace: ['@at $updatepljobstatus (findAndUpdatePlJob) - no job'],
            message: 'no pipeline id',
            id,
            jobid: doc.job.jobid,
        });
    }

    const pldoc: IJobModel | null = await findOne(doc.job.jobid);

    if (pldoc === null || !pldoc.jobs || !pldoc.jobs[id]) {
        return Promise.reject({
            trace: ['@at $updatepljobstatus (findAndUpdatePlJob) - no doc'],
            message: 'no pipeline document',
            plid: doc.job.jobid,
            jobid: doc.job.jobid,
        });
    }

    const plid: string = pldoc._id.toString();

    await updatePlJobStatus(pldoc, { id, status: doc.job.status }).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $updatepljobstatus (findAndUpdatePlJob) - updatePlJobStatus');
        err.id = id;
        err.plid = plid;
        err.status = doc.job.status;

        return Promise.reject(err);
    });

    return Promise.resolve();
};

export const updatePlStatus: (pldoc: IJobModel, job: { id: string; status: string }) => Promise<void> = async (
    pldoc: IJobModel,
    job: { id: string; status: string }
): Promise<void> => {
    const plid: string = pldoc._id.toString();
    await findOneAndUpdate(plid, { $set: { 'job.status': pldoc.job.status } }).catch(async (err: any) => {
        err.trace = ['@at $authorization (login-email)'];
        void utils.logError(
            `$updatepljobstatus (updatePlStatus): save failed - pl: ${plid} - status: ${pldoc.job.status}`,
            err
        );

        return Promise.reject(err);
    });

    utils.logInfo(
        `$updatepljobstatus (updatePlStatus): update pipeline status - pl: ${plid} -  pl status: ${pldoc.job.status} - job: ${job.id} - status: ${job.status}`
    );

    return Promise.resolve();
};
