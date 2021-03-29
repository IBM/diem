import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { pubSub } from '@config/pubsub';
import { IJobResponse } from '@models';
import { addTrace } from '../shared/functions';

export const spark_callback: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const response: IJobResponse = { ...req.body };

    let body: IJobResponse;

    if (typeof response === 'string') {
        try {
            body = JSON.parse(response);
        } catch (err) {
            body = response;
        }
    } else {
        body = response;
    }

    try {
        utils.logInfo(`$job.callback (spark_callback): incoming payload - job: ${body.id}`, body.transid);

        await pubSub.publish(body);

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.callback (spark_callback)');

        return Promise.reject(err);
    }
};
