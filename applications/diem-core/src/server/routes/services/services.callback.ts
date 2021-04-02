import { utils } from '@common/utils';
import { EStoreActions, IRequest } from '@interfaces';
import { addTrace } from '../shared/functions';
import { pubSub } from '@config/pubsub';
import { IJobResponse } from '@models';

const jobdetail: string = 'jobdetail.store';

export const jobOutHandler: (job: Partial<IJobResponse>) => Promise<any> = async (
    job: Partial<IJobResponse>
): Promise<any> => {
    utils.logInfo(`$job.handler (jobHandler): out payload - job: ${job.id}`, job.transid);

    return Promise.resolve({
        loaded: true,
        store: jobdetail,
        targetid: job.jobid || job.id,
        options: {
            field: 'servicesout',
        },
        type: EStoreActions.ADD_STORE_TABLE_RCD,
        values: {
            out: job.out || job.error,
            special: job.special,
        },
    });
};

export const services_callback: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const response: IJobResponse = { ...req.body };

    let job: IJobResponse;

    if (typeof response === 'string') {
        try {
            job = JSON.parse(response);
        } catch (err) {
            job = response;
        }
    } else {
        job = response;
    }

    try {
        utils.logInfo(`$job.callback (services_callback): incoming payload - job: ${job.id}`, job.transid);

        const results: any = await jobOutHandler(job);
        /* pass the message to redis for global handling */

        utils.logInfo(`$services_callback (services_callback): publishing payload - job: ${job.id}`);
        pubSub.publishClientPayload({
            clientEmail: job.email,
            payload: { payload: [results] },
        });

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.callback (services_callback)');

        return Promise.reject(err);
    }
};
