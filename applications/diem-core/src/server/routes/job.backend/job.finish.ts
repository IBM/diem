import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { IModel, IJob, ExecutorTypes } from '@models';
import { deleteJob } from '../executors/spark/spark.job';
import { jobLogger } from '../job.logger/job.logger';
import { addTrace } from '../shared/functions';

export const finishJob: (doc: IModel) => Promise<any> = async (doc: IModel): Promise<any> => {
    if (doc.job.executor === ExecutorTypes.pyspark) {
        await deleteJob(doc._id.toString()).catch((err: IError) => {
            err.trace = addTrace(err.trace, '@at $job.finish (finishJob)');
        });
    }

    if (!doc.job.jobend) {
        doc.job.jobend = new Date();
    }

    if (doc.job.jobstart) {
        // a zero never displays as equal to false.. so the minimum is one second
        const runtime: number = Math.round(Math.abs(doc.job.jobend.getTime() - doc.job.jobstart.getTime()) / 1000) || 1;
        doc.job.runtime = runtime === 0 ? 1 : runtime;
    }

    const log: IJob = {
        ...doc.toObject().job,
        count: doc.job.count ? Number(doc.job.count) : 0,
        name: doc.name,
    };

    if (Array.isArray(doc.log)) {
        if (doc.log.length > 9) {
            doc.log.pop();
        }
        doc.log.unshift(log);
    } else {
        doc.log = [log];
    }

    await jobLogger(doc).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.stop (jobStop)');

        // we just log the error here
        void utils.logError('$job.start.handler (saveDoc): error', err);
    });

    return Promise.resolve();
};
