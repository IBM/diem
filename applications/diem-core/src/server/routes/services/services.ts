/** this code is used for external services, external api's */

import { utils } from '@common/utils';
import { IRequest, IError, INatsPayload } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { addTrace } from '@functions';
import { prepareNodePyServicesJob, IServices } from '../executors/nodepy/np.create.services';
import { INodePyJob } from '../executors/nodepy/np.interfaces';

interface IServicesReturn {
    message: string;
}

export const services: (req: IRequest) => Promise<IServicesReturn> = async (
    req: IRequest
): Promise<IServicesReturn> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IServices = { ...req.body };

    body.email = req.user.email;
    body.transid = utils.guid();
    body.serviceid = body.id;

    /**
     * get the code for the pyfile
     *
     * @info the false is to ensure the code is not decoded
     */
    const nodepyJob: INodePyJob = await prepareNodePyServicesJob(body).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $services (services)');

        return Promise.reject(err);
    });

    // Post the Job
    const result: INatsPayload | undefined = await publisher
        .request('nodepy.services.start', {
            ...nodepyJob,
            params: JSON.stringify(nodepyJob.params), // pass the params seperately (stringify)
        })
        .catch(async (err: IError) => {
            err.trace = addTrace(err.trace, '@at $services (service) -  request');

            err.return = {
                message: err.message,
                status: err.status,
            };

            // as we return directly to the user, we need to log the job here

            if (err.status === 503) {
                void utils.logError(`$services (services): error for job: ${body.id}`, err);
            }

            return Promise.reject(err);
        });

    utils.logInfo(`$services (services) - job ${body.id}`, req.transid, process.hrtime(hrstart));

    let payload: any = {};

    if (!result?.data) {
        payload = {
            message: 'no data',
        };
    } else {
        payload = result.data;
        if (result.data.out) {
            try {
                payload.out = JSON.parse(result.data.out);
            } catch (err) {
                // continue
            }
        }
    }

    return Promise.resolve(payload);
};
