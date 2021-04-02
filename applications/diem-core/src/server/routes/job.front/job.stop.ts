import { utils } from '@common/utils';
import { EJobStatus, IETLJob, ExecutorTypes, IJobResponse } from '@models';
import { pubSub } from '@config/pubsub';
import { publisher } from '@config/nats_publisher';
import { deleteJob } from '../executors/spark/spark.job';
import { addTrace } from '../shared/functions';

const stopSparkJob: (job: IETLJob) => Promise<boolean | Error> = async (job: IETLJob): Promise<boolean | Error> => {
    utils.logInfo(`$job.actions (jobStop): spark delete request - job: ${job.id}`, job.transid);

    try {
        await deleteJob(job.id);

        utils.logInfo(`$job.actions (jobStop): sparkjob deleted - job ${job.id}`, job.transid);
    } catch (err) {
        err.message = err.message ? err.message : err;
        err.name = 'job';
        err.trace = addTrace(err.trace, '@at $job.stop (stopSparkJob)');

        void utils.logError(`$job.actions (jobStop): delete failed - job: ${job.id}`, err);

        job.status = EJobStatus.failed;
    }

    await pubSub.publish({
        ...job,
        count: null,
        jobend: new Date(),
        jobstart: job.jobstart || new Date(),
        runtime: Math.round(Math.abs(new Date().getTime() - (job.jobstart || new Date()).getTime()) / 1000) || 0,
        status: job.status,
        transid: job.transid,
    });

    return Promise.resolve(true);
};

export const stopNodePyJob: (job: IETLJob) => Promise<void> = async (job: IETLJob): Promise<void> => {
    utils.logInfo(`$job.actions (jobStop): NodePy stop request - job: ${job.id}`, job.transid);

    const response_job: IJobResponse = {
        ...job,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
        status: EJobStatus.stopped,
        transid: job.transid,
    };

    // instruct nodepy to stop all running processes
    void publisher.publish('global.nodepy.stop', response_job);

    // we must assume nodepy cleans it up
    await pubSub.publish(response_job);
};

export const stopPlJob: (job: IETLJob) => Promise<boolean | Error> = async (job: IETLJob): Promise<boolean | Error> => {
    utils.logInfo(
        `$job.actions (stopPlJob): publishing stop requestt - pl: ${job.jobid} - job: ${job.id}`,
        job.transid
    );

    await pubSub.publish({
        ...job,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
        status: EJobStatus.stopped,
        transid: job.transid,
    });

    return Promise.resolve(true);
};

export const jobStop: (job: IETLJob) => Promise<boolean | Error> = async (job: IETLJob): Promise<boolean | Error> => {
    try {
        if (job.executor === ExecutorTypes.nodepy) {
            await stopNodePyJob(job);
        } else if (job.executor === ExecutorTypes.pyspark) {
            await stopSparkJob(job);
        }

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.stop (jobStop)');

        return Promise.reject(err);
    }
};
