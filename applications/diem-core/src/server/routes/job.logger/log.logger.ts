/* eslint-disable @typescript-eslint/quotes */
import { utils } from '@common/utils';
import { IModel, IJob, JobLogModel, IJobLog } from '../models/models';

export const logLogger: (doc: IModel) => Promise<void> = async (doc: IModel): Promise<void> => {
    const id: string = doc._id.toString();
    const job: IJob = doc.toObject().job;

    const joblog: IJobLog = {
        ...job,
        out: doc.out,
        logid: id,
        name: doc.name,
        project: doc.project,
        type: doc.type,
    };

    await JobLogModel.collection.insertOne(joblog);

    utils.logInfo(`$job.logger (toLog): logging - id: ${id} - name: ${doc.name}`, doc.job.transid);

    return Promise.resolve();
};
