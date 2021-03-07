/* eslint-disable max-len */
import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { addTrace } from '../../shared/functions';
import { IModel } from '../../models/models';
import { findOne, findOneAndUpdate } from './findone';

export const updatePlJobStatus: (plid: string, job: { id: string; status: string }) => Promise<IModel> = async (
    plid: string,
    job: { id: string; status: string }
): Promise<IModel> => {
    let pldoc: IModel | null = await findOne(plid);

    if (pldoc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            trace: addTrace([], '@at $updatepljobstatus (updatePlJobStatus) - no doc'),
        });
    }

    if (pldoc.jobs[job.id] && pldoc.jobs[job.id].status !== job.status) {
        utils.logInfo(
            `$updatepljobstatus (updatePlJobStatus): updating pipeline job status - pl: ${plid} - doc: ${
                job.id
            } - old: ${pldoc.jobs[job.id].status}  - new: ${job.status}`
        );

        const f: string = `jobs.${job.id}.status`;

        pldoc = await findOneAndUpdate(plid, { $set: { [f]: job.status } }).catch(async (err: any) => {
            err.trace = ['@at $authorization (login-email)'];
            void utils.logError(
                `$updatepljobstatus (findAndUpdatePlJob): save failed - pl: ${plid} - job: ${job.id}`,
                err
            );

            return Promise.reject(err);
        });

        if (pldoc === null) {
            return Promise.reject({
                message: 'The document to update could not be found',
                trace: addTrace([], '@at $updatepljobstatus (findOneAndUpdate) - no doc'),
            });
        }

        return Promise.resolve(pldoc);
    }

    utils.logInfo(
        `$updatepljobstatus (updatePlJobStatus): no pipeline job status update needed - pl: ${plid} - job: ${job.id} - status: ${job.status}`
    );

    return Promise.resolve(pldoc);
};

export const findAndUpdatePlJob: (doc: IModel) => Promise<void> = async (doc: IModel): Promise<void> => {
    const id: string = doc._id.toString();

    if (!doc.job || (doc.job && !doc.job.jobid)) {
        return Promise.reject({
            trace: ['@at $updatepljobstatus (findAndUpdatePlJob) - no job'],
            message: 'no pipeline id',
            id,
            jobid: doc.job.jobid,
        });
    }

    const pldoc: IModel | null = await findOne(doc.job.jobid);

    if (pldoc === null || !pldoc.jobs || !pldoc.jobs[id]) {
        return Promise.reject({
            trace: ['@at $updatepljobstatus (findAndUpdatePlJob) - no doc'],
            message: 'no pipeline document',
            plid: doc.job.jobid,
            jobid: doc.job.jobid,
        });
    }

    const plid: string = pldoc._id.toString();

    await updatePlJobStatus(plid, { id, status: doc.job.status }).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $updatepljobstatus (findAndUpdatePlJob) - updatePlJobStatus');
        err.id = id;
        err.plid = plid;
        err.status = doc.job.status;

        return Promise.reject(err);
    });

    return Promise.resolve();
};

export const updatePlStatus: (pldoc: IModel, job: { id: string; status: string }) => Promise<void> = async (
    pldoc: IModel,
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
