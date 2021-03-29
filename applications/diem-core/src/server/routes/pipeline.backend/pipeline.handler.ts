/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { IntPayload } from '@interfaces';
import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IModel } from '@models';

import { pubSub } from '@config/pubsub';

import { addTrace } from '../shared/functions';
import {
    findOne,
    makePlPayload,
    finishPl,
    startNextJobs,
    checkPlCompleted,
    updatePlJobStatus,
    stopJobs,
    updatePlStatus,
} from './pipeline.helpers/helpers';

export const pipelineHandler: (job: IJobResponse, payload: IntPayload[]) => Promise<IntPayload[]> = async (
    job: IJobResponse,
    payload: IntPayload[]
): Promise<IntPayload[]> => {
    /**
     * below is the code that will check if there are any dependencies
     */

    if (!job.jobid) {
        utils.logInfo(
            `$pipeline.handler (pipelineHandler): this is not a pipeline - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`
        );

        return Promise.resolve(payload);
    }

    let pldoc: IModel | null = await findOne(job.jobid);

    if (pldoc === null || !pldoc.jobs || !pldoc.jobs[job.id]) {
        return Promise.reject({
            trace: ['@at $pipeline.handler (pipelineHandler)'],
            message: 'pipeline reference error',
            id: job.id.toString(),
            jobid: job.jobid,
        });
    }

    const plid: string = pldoc._id.toString();

    // here we start

    if (job.status === EJobStatus.running || job.status === EJobStatus.submitted) {
        job.status = EJobStatus.running; // ! we convert any job in status submitted to running

        if (['Stopped', 'Failed'].includes(pldoc.job.status)) {
            // a restart from a failed or stopped pipeline

            utils.logInfo(
                `$pipeline.handler (pipelineHandler): change pipeline status - pl: ${job.jobid} - pl status: ${pldoc.job.status} - job: ${job.id} - status: ${job.status}`
            );

            pldoc = await updatePlJobStatus(plid, job);

            if (pldoc.job.status !== job.status) {
                pldoc.job.status = job.status; // running is enough to cover both submitted and running

                await updatePlStatus(pldoc, job);
            }

            await makePlPayload(pldoc, job, payload);

            if (pldoc.job.jobid !== plid) {
                utils.logInfo(
                    `$pipeline.handler (pipelineHandler): informing calling pl - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`,
                    job.transid
                );
                await pubSub.publish({
                    count: null,
                    email: job.email,
                    executor: job.executor,
                    id: plid,
                    jobend: pldoc.job.jobend,
                    jobid: pldoc.job.jobid,
                    jobstart: pldoc.job.jobstart,
                    name: pldoc.name,
                    runby: job.runby,
                    runtime: pldoc.job.runtime,
                    status: job.status,
                    transid: job.transid,
                    org: job.org,
                });
            }

            return Promise.resolve(payload);
        }

        if (pldoc.job.status !== job.status) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): verify job status - pl: ${job.jobid} - pl status: ${pldoc.job.status} - job: ${job.id} - new status: ${job.status}`
            );

            pldoc = await updatePlJobStatus(plid, job);

            pldoc.job.status = job.status; // running is enough to cover both submitted and running

            await updatePlStatus(pldoc, job);

            await makePlPayload(pldoc, job, payload);

            if (pldoc.job.jobid !== plid) {
                utils.logInfo(
                    `$pipeline.handler (pipelineHandler): publishing calling pl - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`,
                    job.transid
                );
                await pubSub.publish({
                    count: null,
                    email: job.email,
                    executor: job.executor,
                    id: plid,
                    jobend: pldoc.job.jobend,
                    jobid: pldoc.job.jobid,
                    jobstart: pldoc.job.jobstart,
                    name: pldoc.name,
                    runby: job.runby,
                    runtime: pldoc.job.runtime,
                    status: job.status,
                    transid: job.transid,
                    org: job.org,
                });
            }
        } else {
            /* for all jobs update the pipeline jobs field and it's status */
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): verify job status - pl: ${plid} - job: ${job.id} - status: ${job.status}`
            );
            await updatePlJobStatus(plid, job);
        }

        return Promise.resolve(payload);
    }

    if (job.status === EJobStatus.stopped && pldoc.job.status !== job.status) {
        /**
         * When we call ghe pipeline to stop, then all running jobs will be stopped
         * So we only need to call this once
         *
         */

        // set the pipelinestatus to stopped ad update the job status of the pipeline's jobs id
        pldoc = await updatePlJobStatus(plid, job);

        if (job.id === plid) {
            if (pldoc.job.status !== job.status) {
                pldoc.job.status = job.status; // running is enough to cover both submitted and running
            }

            utils.logInfo(
                `$pipeline.handler (pipelineHandler): stopping all jobs - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`
            );
            await stopJobs(pldoc);

            await finishPl(job, pldoc);

            await makePlPayload(pldoc, job, payload);
        } else {
            // incomplete means that there are still pending jobs
            const [incomplete, isfailed, isstopped]: [boolean, boolean, boolean] = await checkPlCompleted(job, plid);

            if (!incomplete) {
                // means Complete
                // set the pipeline to complete and save the pipeline
                pldoc.job.status = isfailed ? EJobStatus.failed : isstopped ? EJobStatus.stopped : job.status;

                await finishPl(job, pldoc).catch(async (err: any) => {
                    err.trace = addTrace(err.trace, '$pipeline.handler (pipelineHandler) - pipeline save');

                    void utils.logError('$pipeline.handler (pipelineHandler: pipeline save error', err);

                    return Promise.resolve(0);
                });

                // create the payload
                await makePlPayload(pldoc, job, payload);

                if (pldoc.job.jobid !== plid) {
                    utils.logInfo(
                        `$pipeline.handler (pipelineHandler): publishing calling pl - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`,
                        job.transid
                    );
                    await pubSub.publish({
                        count: pldoc.job.count,
                        email: job.email,
                        executor: job.executor,
                        id: plid,
                        jobend: pldoc.job.jobend,
                        jobid: pldoc.job.jobid,
                        jobstart: pldoc.job.jobstart,
                        name: pldoc.name,
                        runby: job.runby,
                        runtime: pldoc.job.runtime,
                        status: job.status,
                        transid: job.transid,
                        org: job.org,
                    });
                }
            }
        }

        if (pldoc.job.jobid !== plid) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): publishing calling pl - pl: ${job.jobid} - target pl: ${pldoc.job.jobid} -  job: ${job.id} - status: ${job.status}`
            );
            await pubSub.publish({
                count: pldoc.job.count,
                email: job.email,
                executor: job.executor,
                id: plid,
                jobend: pldoc.job.jobend,
                jobid: pldoc.job.jobid,
                jobstart: pldoc.job.jobstart,
                name: pldoc.name,
                runby: job.runby,
                runtime: pldoc.job.runtime,
                status: job.status,
                transid: job.transid,
                org: job.org,
            });
        }

        return Promise.resolve(payload);
    }

    if (['Completed', 'Failed'].includes(job.status)) {
        pldoc = await updatePlJobStatus(plid, job);

        if (pldoc.jobs[job.id] && !(pldoc.jobs[job.id].required === 'all' && job.status === EJobStatus.failed)) {
            const nextJobs: number = await startNextJobs(job, pldoc);

            // there are next jobs so let the pipeline run
            if (nextJobs > 0) {
                utils.logInfo(
                    `$pipeline.handler (pipelineHandler): continuing next jobs - pl: ${job.jobid} - jobs: ${nextJobs}`,
                    job.transid
                );

                return Promise.resolve(payload);
            }
        } else {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): no next jobs - pl: ${job.jobid} - job: ${job.id} - job status: ${
                    job.status
                } - required: ${pldoc.jobs[job.id].required}`,
                job.transid
            );
        }

        // incomplete means that there are still pending jobs
        const [incomplete, isfailed]: [boolean, boolean, boolean] = await checkPlCompleted(job, plid);

        if (!incomplete) {
            // means Complete
            // set the pipeline to complete and save the pipeline
            pldoc.job.status = isfailed ? EJobStatus.failed : job.status;

            await finishPl(job, pldoc).catch(async (err: any) => {
                err.trace = addTrace(err.trace, '$pipeline.handler (pipelineHandler) - pipeline save');

                void utils.logError('$pipeline.handler (pipelineHandler: pipeline save error', err);

                return Promise.resolve(0);
            });

            // create the payload
            await makePlPayload(pldoc, job, payload);

            if (pldoc.job.jobid !== plid) {
                utils.logInfo(
                    `$pipeline.handler (pipelineHandler): publishing calling pl - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`,
                    job.transid
                );
                await pubSub.publish({
                    count: pldoc.job.count,
                    email: job.email,
                    executor: job.executor,
                    id: plid,
                    jobend: pldoc.job.jobend,
                    jobid: pldoc.job.jobid,
                    jobstart: pldoc.job.jobstart,
                    name: pldoc.name,
                    runby: job.runby,
                    runtime: pldoc.job.runtime,
                    status: job.status,
                    transid: job.transid,
                    org: job.org,
                });
            }
        }

        return Promise.resolve(payload);
    }

    //   return Promise.resolve(payload);

    return Promise.resolve(payload);
};
