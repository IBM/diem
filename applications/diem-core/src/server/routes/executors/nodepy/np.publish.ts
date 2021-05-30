/* eslint-disable @typescript-eslint/quotes */

import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { EJobStatus, IETLJob } from '@models';
import { pubSub } from '@config/pubsub';
import { publisher } from '@config/nats_publisher';
import { addTrace } from '@functions';

export interface INodePyJob extends IETLJob {
    code: string;
}

export const nodePyRequestJob: (job: INodePyJob) => Promise<void> = async (job: INodePyJob): Promise<void> => {
    void pubSub.publish({
        ...job,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
    });

    await publisher.request('nodepy.job.start', job).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $np.publish (nodePyRequestJob) - request');

        void utils.logError(`$np.publish (nodePyRequestJob): error - job: ${job.id}`, err);

        void pubSub.publish({
            ...job,
            count: null,
            jobend: new Date(),
            jobstart: new Date(),
            runtime: null,
            error: err.message,
            status: EJobStatus.failed,
        });
    });

    return Promise.resolve();
};
