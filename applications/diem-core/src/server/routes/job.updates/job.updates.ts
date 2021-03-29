import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { IJobBody, ISocketPayload } from '@models';
import { addTrace } from '../shared/functions';
import { actionClone } from './job.action.clone';
import { actionUpdate } from './job.action.update';
import { actionDelete } from './job.action.delete';
import { actionNew } from './job.action.new';
import { actionAssign } from './job.action.assign';

const actions: any = {
    assign: actionAssign,
    clone: actionClone,
    delete: actionDelete,
    new: actionNew,
    update: actionUpdate,
};

export const jobupdates: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IJobBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;
    body.org = req.user.org;

    /** before we continue
     * we don't need a few field
     * jobs and log are not needed
     */

    body.jobs = {};
    body.log = [];
    body.graph = undefined;

    if (!body.action || (body.action && !actions[body.action])) {
        return Promise.reject({
            trace: ['@at $job.update (jobupdates)'],
            message: `No Valid Action for job ${body.id}`,
        });
    }

    try {
        const serverPayload: ISocketPayload = await actions[body.action]({ ...body });
        utils.logInfo(
            `$job.update (jobupdates) document ${body.id} saved - email: ${body.email}`,
            req.transid,
            process.hrtime(hrstart)
        );

        serverPayload.org = body.org;

        void publisher.publish_global('users', serverPayload);

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.update (jobupdates)');
        err.email = body.email;

        return Promise.reject(err);
    }
};
