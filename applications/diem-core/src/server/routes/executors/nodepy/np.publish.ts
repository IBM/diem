/* eslint-disable @typescript-eslint/quotes */

import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { EJobStatus, IETLJob } from '@models';
import { pubSub } from '@config/pubsub';
import { publisher } from '@config/nats_publisher';
import { addTrace } from '../../shared/functions';

export interface INodePyJob extends IETLJob {
    code: string;
}

export const nodePyPublishJob: (job: INodePyJob) => Promise<void> = async (job: INodePyJob): Promise<void> => {
    await publisher.request('nodepy.job.start', job).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $np.publish (nodePyPublishJob) - response');
        utils.logInfo(`$nodepy.job (job): error from nodepy - job: ${job.id}`, `ti: ${job.transid}`);

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

    // we publish first the job , any error will handled later
    void pubSub.publish({
        ...job,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
        status: EJobStatus.submitted,
    });

    return Promise.resolve();
};
