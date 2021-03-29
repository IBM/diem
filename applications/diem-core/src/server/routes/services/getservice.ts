/** this code is used for internal call , internal services */

import { utils } from '@common/utils';
import { IRequest, IError, EStoreActions } from '@interfaces';
import { pubSub } from '@config/pubsub';
import { base64encode, addTrace } from '../shared/functions';
import { npcodefileservices } from '../executors/nodepy/np.codefile.services';
import { servicesPostJob } from './services.postjob';
import { jobOutHandler } from './services.callback';

const jobdetail: string = 'jobdetail.store';

interface IServices {
    email: string;
    id: string;
    serviceid: string;
    jobid?: string;
    token: string;
    transid: string;
}

export const getservice: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    // eslint-disable-next-line no-async-promise-executor

    const hrstart: [number, number] = process.hrtime();

    const body: IServices = { ...req.body };

    const id: string = body.id;

    const serviceid: string = body.serviceid;

    body.id = serviceid;
    body.jobid = id;
    body.email = req.user.email;
    body.transid = req.transid;

    /**
     * get the code for the pyfile
     *
     * @info the false is to ensure the code is not decoded
     */
    const code: string = await npcodefileservices(body).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $services (npcodefile)');

        return Promise.reject(err);
    });

    /* we post the job to nodepy but void the return
    In case of an error we socket the response
    The code must continue
    */

    try {
        void servicesPostJob({
            code: base64encode(code),
            transid: req.transid,
            id,
        });
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $services (servicesPostJob)');

        // as we return directly to the user, we need to log the job here
        void utils.logError(`$services (servicesPostJob): error for job: ${id}`, err);

        const results: any = await jobOutHandler({ id: body.id, out: err });
        /* pass the message to redis for global handling */

        utils.logInfo(`$pubsub (publish): publishing payload - job: ${body.id}`);
        pubSub.publishClientPayload({
            clientEmail: body.email,
            payload: { payload: [results] },
        });
    }

    utils.logInfo(
        `$getservice (getservice): service posted - job ${id} - service: ${serviceid}`,
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
                    field: 'servicesout',
                },
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: {
                    servicesout: [{ out: 'started' }],
                },
            },
        ],
    });
};
