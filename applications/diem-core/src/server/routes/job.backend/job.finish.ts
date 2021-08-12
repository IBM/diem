import { utils } from '@common/utils';
import { IJobModel, IJob } from '@models';
import { addTrace } from '@functions';
import { jobLogger } from '../job.logger/job.logger';
import { sparkWatcher } from '../spark-operator/spark.watcher';

export const getPySparkJobLog: (doc: IJobModel) => Promise<IJobModel> = async (doc: IJobModel): Promise<IJobModel> => {
    const id: string = doc._id.toString();

    let sparkLog: string | undefined = await sparkWatcher.getJobLog(id).catch(async () => {
        void utils.logInfo(`$job.finish (getPySparkJobLog): no log found - id: ${id}`);

        return Promise.resolve(doc);
    });

    if (sparkLog) {
        if (sparkLog.length && sparkLog.length > 10000) {
            sparkLog = `${sparkLog.slice(0, 3000)}\n\n....\n\n${sparkLog.slice(-7000)}`;
        }

        doc.job.error = `${doc.job.error}\n\n*** Attaching Spark Log***\n\n${sparkLog}`;
    }

    return Promise.resolve(doc);
};

export const jobFinish: (doc: IJobModel) => Promise<[IJobModel, any]> = async (
    doc: IJobModel
): Promise<[IJobModel, any]> => {
    const id: string = doc._id.toString();

    const insert: any = { $set: {} };

    /* code removed in favor of the TTL
    if (doc.job.executor === ExecutorTypes.pipeline) {
        await deleteJob(id).catch((err: IError) => {
            err.trace = addTrace(err.trace, '@at $job.finish (jobFinish) - deleteJob');
        });
    }
    */

    if (!doc.job.jobend) {
        doc.job.jobend = new Date();
    }

    if (doc.job.jobstart) {
        // a zero never displays as equal to false.. so the minimum is one second
        const runtime: number = Math.round(Math.abs(doc.job.jobend.getTime() - doc.job.jobstart.getTime()) / 1000) || 1;
        // because 0 equals false in js
        doc.job.runtime = runtime === 0 ? 1 : runtime;
    }

    doc.job.jobid = id;

    const log: IJob = {
        ...doc.toObject().job,
        count: doc.job.count ? Number(doc.job.count) : 0,
        name: doc.name,
    };

    // don't archive the audit trail in the log
    // we only keep it in the archiving
    log.audit = undefined;

    if (Array.isArray(doc.log)) {
        if (doc.log.length > 9) {
            doc.log.pop();
            // insert.$pop = { log: 1 };
        }
        doc.log.unshift(log);
        //insert.$push = { log: { $each: [log], $position: 0 } };
    } else {
        // insert.$push = { out: log };
        doc.log = [log];
    }

    insert.$set.log = doc.toObject().log;

    utils.logInfo(`$job.finish (getPySparkJobLog): passing to jobLogger - id: ${id}`);

    await jobLogger(doc).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.finish (jobStop)');

        // we just log the error here
        void utils.logError('$job.finish (saveDoc): error', err);
    });

    // the job is logged with it's audit , so we don't need the audit anymore
    doc.job.audit = undefined;

    return Promise.resolve([doc, insert]);
};
