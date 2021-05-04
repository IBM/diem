/** this code is used for external services, external api's */

import { utils } from '@common/utils';
import { IRequest, IError, INatsPayload } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { base64encode, addTrace } from '@functions';
import { npcodefileservices, IServices } from '../executors/nodepy/np.codefile.services';

interface IServicesReturn {
    message: string;
}

export const services: (req: IRequest) => Promise<IServicesReturn> = async (
    req: IRequest
): Promise<IServicesReturn> => {
    // eslint-disable-next-line no-async-promise-executor

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
    const code: string = await npcodefileservices(body).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $services (services)');

        return Promise.reject(err);
    });

    // Post the Job
    const result: INatsPayload | undefined = await publisher
        .request('nodepy.services.start', {
            code: base64encode(code),
            transid: req.transid,
            id: body.id,
            params: JSON.stringify(body.params),
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

    return Promise.resolve(result?.data);
};
