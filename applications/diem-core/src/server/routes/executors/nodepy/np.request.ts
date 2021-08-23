import { IError } from '@interfaces';
import { IETLJob } from '@models';
import { pubSub } from '@config/pubsub';
import { publisher } from '@config/nats_publisher';
import { addTrace } from '@functions';

export interface INodePyJob extends IETLJob {
    code: string;
    language: string;
}

export const nodePyRequestJob: (nodepyJob: INodePyJob) => Promise<void> = async (
    nodepyJob: INodePyJob
): Promise<void> => {
    nodepyJob.jobstart = new Date();
    nodepyJob.jobend = null;

    await publisher.request('nodepy.job.start', nodepyJob).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $np.request (nodePyRequestJob) - request');

        return Promise.reject(err);
    });

    void pubSub.publish({
        ...nodepyJob,
        count: null,
        runtime: null,
    });

    return Promise.resolve();
};
