/* eslint-disable @typescript-eslint/quotes */

import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { EJobStatus, IETLJob } from '@models';
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

    void pubSub.publish({
        ...nodepyJob,
        count: null,
        runtime: null,
    });

    await publisher.request('nodepy.job.start', nodepyJob).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $np.request (nodePyRequestJob) - request');

        void utils.logError(`$np.request (nodePyRequestJob): error - job: ${nodepyJob.id}`, err);

        void pubSub.publish({
            ...nodepyJob,
            count: null,
            jobend: new Date(),
            runtime: null,
            error: err.message,
            status: EJobStatus.failed,
        });
    });

    return Promise.resolve();
};
