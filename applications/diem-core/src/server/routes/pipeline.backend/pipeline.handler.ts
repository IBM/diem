/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { IntPayload } from '@interfaces';
import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IJobModel } from '@models';

import { pubSub } from '@config/pubsub';

import { addTrace } from '@functions';
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

    const job_copy: IJobResponse = { ...job };
    const payload_copy: IntPayload[] = { ...payload };

    if (!job.jobid) {
        utils.logInfo(
            `$pipeline.handler (pipelineHandler): this is not a pipeline - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`
        );

        return Promise.resolve(payload);
    }

    let pldoc: IJobModel | null = await findOne(job.jobid);

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
        // job.status = EJobStatus.running; // ! we convert any job in status submitted to running

        pldoc = await updatePlJobStatus(pldoc, job);

        job.status = EJobStatus.running;

        if (pldoc.job.status !== job.status) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): changed status - pl: ${job.jobid} - pl status: ${pldoc.job.status} - job: ${job.id} - new status: ${job.status}`
            );

            pldoc = await updatePlJobStatus(pldoc, job);

            pldoc.job.status = job.status; // running is enough to cover both submitted and running

            await updatePlStatus(pldoc, job);

            await makePlPayload(pldoc, job, payload);

            if (pldoc.job.jobid !== plid) {
                utils.logInfo(
                    `$pipeline.handler (pipelineHandler): 1 - publishing ${job.status} - pl: ${job.jobid} - job: ${job.id} - tgt jobid: ${pldoc.job.jobid}`,
                    job.transid
                );
                void pubSub.publish({
                    count: null,
                    email: job.email,
                    executor: job.executor,
                    id: plid,
                    jobend: pldoc.job.jobend,
                    jobid: pldoc.job.jobid,
                    jobstart: pldoc.job.jobstart,
                    name: pldoc.name,
                    runby: pldoc.job.runby,
                    runtime: pldoc.job.runtime,
                    status: job.status,
                    transid: job.transid,
                    org: job.org,
                });
            }
        } else {
            /* for all jobs update the pipeline jobs field and it's status */
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): passing to updatePlJobStatus - pl: ${plid} - pl status: ${pldoc.job.status} - job: ${job.id} - status: ${job.status}`
            );
            pldoc = await updatePlJobStatus(pldoc, job);
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
        pldoc = await updatePlJobStatus(pldoc, job);

        if (job.id === plid) {
            // the pipeline to stopp was called
            if (pldoc.job.status !== job.status) {
                pldoc.job.status = job.status; // running is enough to cover both submitted and running
            }

            utils.logInfo(
                `$pipeline.handler (pipelineHandler): stopping all jobs - pl: ${job.jobid} - job: ${job.id} - status: ${job.status}`
            );
            await stopJobs(pldoc);
        } else {
            // incomplete means that there are still pending jobs
            const [incomplete, isfailed, isstopped]: [boolean, boolean, boolean] = await checkPlCompleted(job, plid);

            if (incomplete) {
                await makePlPayload(pldoc, job, payload);
            }
            // means Complete
            // set the pipeline to complete and save the pipeline
            pldoc.job.status = isfailed ? EJobStatus.failed : isstopped ? EJobStatus.stopped : job.status;

            await finishPl(pldoc).catch(async (err: any) => {
                if (err?.name && err.name.toLowerCase().includes('versionerror')) {
                    err.VersionError = true;

                    utils.logRed(
                        `$pipeline.handler (pipelineHandler): version error - Stopped - pl: ${job.jobid} - job: ${job.id}`
                    );

                    return pipelineHandler(job_copy, payload_copy);
                } else {
                    err.trace = addTrace(err.trace, '@at $pipeline.handler (pipelineHandler) - finishPl - Stopped');

                    return Promise.reject(err);
                }
            });

            // create the payload
            await makePlPayload(pldoc, job, payload);
        }

        if (pldoc.job.jobid !== plid) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): 2 - publishing ${job.status} - pl: ${job.jobid} - job: ${job.id} - tgt jobid: ${pldoc.job.jobid}`,
                job.transid
            );
            void pubSub.publish({
                count: pldoc.job.count,
                email: job.email,
                executor: job.executor,
                id: plid,
                jobend: pldoc.job.jobend,
                jobid: pldoc.job.jobid,
                jobstart: pldoc.job.jobstart,
                name: pldoc.name,
                runby: pldoc.job.runby,
                runtime: pldoc.job.runtime,
                status: job.status,
                transid: job.transid,
                org: job.org,
            });
        }

        return Promise.resolve(payload);
    }

    if (['Completed', 'Failed'].includes(job.status)) {
        pldoc = await updatePlJobStatus(pldoc, job);

        let nextJobs: number = 0;

        nextJobs = await startNextJobs(job, pldoc).catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $pipeline.handler (pipelineHandler) - startNextJobs');

            return Promise.reject(err);
        });

        // there are next jobs so let the pipeline run
        if (nextJobs > 0) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): continuing next jobs - pl: ${job.jobid} - jobs: ${nextJobs}`,
                job.transid
            );

            return Promise.resolve(payload);
        }

        // incomplete means that there are still pending jobs
        const [incomplete, isfailed, isstopped]: [boolean, boolean, boolean] = await checkPlCompleted(job, plid);

        if (incomplete) {
            return Promise.resolve(payload);
        }
        // means Complete
        // set the pipeline to complete and save the pipeline
        pldoc.job.status = isfailed ? EJobStatus.failed : isstopped ? EJobStatus.stopped : job.status;

        await finishPl(pldoc).catch(async (err: any) => {
            if (err?.name && err.name.toLowerCase().includes('versionerror')) {
                err.VersionError = true;

                utils.logRed(
                    `$pipeline.handler (pipelineHandler): version error - Completed/Failed - pl: ${job.jobid} - job: ${job.id}`
                );

                return pipelineHandler(job_copy, payload_copy);
            } else {
                err.trace = addTrace(
                    err.trace,
                    '@at $pipeline.handler (pipelineHandler) - finishPl - Completed/Failed'
                );

                return Promise.reject(err);
            }
        });

        // create the payload
        await makePlPayload(pldoc, job, payload);

        if (pldoc.job.jobid !== plid) {
            utils.logInfo(
                `$pipeline.handler (pipelineHandler): 3 - publishing ${job.status} - pl: ${job.jobid} - job: ${job.id} - tgt jobid: ${pldoc.job.jobid}`,
                job.transid
            );
            void pubSub.publish({
                count: pldoc.job.count,
                email: job.email,
                executor: job.executor,
                id: plid,
                jobend: pldoc.job.jobend,
                jobid: pldoc.job.jobid,
                jobstart: pldoc.job.jobstart,
                name: pldoc.name,
                runby: pldoc.job.runby,
                runtime: pldoc.job.runtime,
                status: pldoc.job.status,
                transid: job.transid,
                org: job.org,
            });
        }

        return Promise.resolve(payload);
    }

    //   return Promise.resolve(payload);

    return Promise.resolve(payload);
};
