/** this code is used for internal call , internal services */

import { utils } from '@common/utils';
import { IRequest, IError, EStoreActions } from '@interfaces';
import { pubSub } from '@config/pubsub';
import { publisher } from '@config/nats_publisher';
import { IJobResponse } from '@models';
import { addTrace } from '@functions';
import { prepareNodePyServicesJob, IServices } from '../executors/nodepy/np.create.services';
import { INodePyJob } from '../executors/nodepy/np.interfaces';

const jobdetail = 'jobdetail.store';

export const servicesOutHandler: (job: Partial<IJobResponse>) => Promise<any> = async (
    job: Partial<IJobResponse>
): Promise<any> => {
    utils.logInfo(`$getservice (servicesOutHandler): out payload - job: ${job.id}`, job.transid);

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

export const getservice: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IServices = { ...req.body };

    const id: string = body.id;

    body.jobid = id;
    body.email = req.user.email;
    body.transid = req.transid;

    /**
     * get the code for the pyfile
     *
     * @info the false is to ensure the code is not decoded
     */
    const nodepyJob: INodePyJob = await prepareNodePyServicesJob(body).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $services (npcodefile)');

        return Promise.reject(err);
    });

    /* we post the job to nodepy but void the return
    In case of an error we socket the response
    The code must continue
    */

    const channel = 'nodepy.job.start';

    try {
        publisher.publish(channel, {
            code: nodepyJob.code,
            transid: req.transid,
            id,
        });
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $services (servicesPostJob)');

        // as we return directly to the user, we need to log the job here
        void utils.logError(`$services (servicesPostJob): error for job: ${id}`, err);

        const results: any = await servicesOutHandler({ id: body.id, out: err });

        utils.logInfo(`$getservice (getservice): publishing payload - job: ${body.id}`);
        void pubSub.publishUserPayload({
            email: body.email,
            payload: { payload: [results] },
        });
    }

    utils.logInfo(
        `$getservice (getservice): service requested - job ${id} - service: ${body.serviceid} - channel:${channel}`,
        req.transid,
        process.hrtime(hrstart)
    );

    return Promise.resolve({
        payload: [
            {
                loaded: true,
                store: jobdetail,
                targetid: id,
                options: {
                    field: body.outfield || 'servicesout',
                },
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: {
                    servicesout: [{ out: 'started' }],
                },
            },
        ],
    });
};
