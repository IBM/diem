import { utils } from '@common/utils';
import { IJobModel, IJob, JobLogModel, IJobLog } from '@models';
import { IError } from '@interfaces';
import { addTrace } from '@functions';

export const logLogger: (doc: IJobModel) => Promise<void> = async (doc: IJobModel): Promise<void> => {
    const id: string = doc._id.toString();
    const job: IJob = doc.toObject().job;

    const joblog: IJobLog = {
        ...job,
        out: doc.out,
        logid: id,
        name: doc.name,
        project: doc.project,
        type: doc.type,
        jobend: doc.job.jobend || null,
        jobstart: doc.job.jobstart || null,
    };

    await JobLogModel.collection.insertOne(joblog).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $log.logger (logLogger)');

        return Promise.reject(err);
    });

    utils.logInfo(`$job.logger (toLog): logging - id: ${id} - name: ${doc.name}`, doc.job.transid);

    return Promise.resolve();
};
