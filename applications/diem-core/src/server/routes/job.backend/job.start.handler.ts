/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { DataModel, EJobTypes, IModel, IETLJob, EJobStatus, ExecutorTypes } from '@models';
import { pubSub } from '@config/pubsub';
import { createSparkPythonJob, ICapacity, publishSparkJob } from '../executors/spark/spark.python.job';
import { createSparkScalaJob } from '../executors/spark/spark.scala.job';
import { createNodePyJob } from '../executors/nodepy/np.create';
import { addTrace } from '../shared/functions';
import { mergeDeep } from '../job.updates/job.action.update';
import { plStartHandler } from '../pipeline.backend/pipeline.start.handler';
import { jobLogger } from '../job.logger/job.logger';
import { saveDoc } from './job.savedoc';

interface ICaller {
    name: string;
    id: string;
}

const findOne: (id: string) => any = async (id: string) => DataModel.findOne({ _id: id }).exec();

export const updateOne: (doc: IModel, obj: any) => any = async (doc: IModel, obj: any) =>
    Promise.resolve(doc.updateOne(obj));

export const jobStartHandler: (job: IETLJob, caller: ICaller) => Promise<void> = async (
    job: IETLJob,
    caller: ICaller
): Promise<void> => {
    const id: string = job.id;
    const doc: IModel = await findOne(id);

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $job.start.handler (jobStartHandler)'],
            caller,
        });
    }

    if (['Rnning', 'Submitted'].includes(doc.job.status)) {
        utils.logInfo(
            `$job.start.handler (jobStartHandler): job already running - pl: ${id} - pl status: ${job.status}`,
            doc.job.transid
        );
    }

    const isPl: boolean = doc.type === EJobTypes.pipeline;
    job.status = isPl ? EJobStatus.running : EJobStatus.submitted;
    doc.job.status = job.status; // the job status is set here ??

    doc.job.jobid = job.jobid;
    doc.job.transid = job.transid;
    doc.job.runby = job.runby;

    const errHandler: (err: IError) => void = async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $job.start.handler (obStartHandler) - errHandler');
        err.email = job.runby;
        err.job = job.id;

        await pubSub.publish({
            ...job,
            count: null,
            executor: job.executor,
            jobend: null,
            jobstart: new Date(),
            runtime: null,
            error: err.message,
            status: 'Failed',
        });

        return Promise.reject(err);
    };

    // If the job is a pipeline then pass it to the pipelineandler

    if (doc.type === EJobTypes.pipeline) {
        // if this is a pipeline document, the start all it's job
        utils.logInfo(
            `$job.start.handler (jobStartHandler): calling plStartHandler - pl: ${id} - pl status: ${job.status}`,
            doc.job.transid
        );

        // for pipeplien we log first
        await jobLogger(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.start.handler (saveDoc) - jobLogger - pipeline');

            // we just log the error here
            return errHandler(err);
        });

        await plStartHandler(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.start.handler (jobStartHandler) - plStartHandler');

            return errHandler(err);
        });

        return Promise.resolve();
    }

    // if there are pipeline config params we assign them here
    if (doc.job.params) {
        if (doc.config && doc.job.params.config) {
            // merge deep to ensure nested values are updated
            doc.config = mergeDeep(doc.config, doc.job.params.config);
        } else if (doc.stmt && doc.job.params.stmt) {
            // merge deep to ensure nested values are updated
            doc.stmt = mergeDeep(doc.stmt, doc.job.params.stmt);
        }
    }

    /* ! important , this is to ensure we always have the right name as this could be a pipeline batch job */
    job.name = doc.name;

    /* ! important , this is to ensure that the job runby is from the caller */
    if (job.runby) {
        doc.job.runby = job.runby;
    }

    /* if there's an out field then reset it to accept new outs */
    if (doc.out && doc.out.length > 0) {
        doc.out = [];
    }

    // add a field for the audit

    doc.job.audit = {};

    /**
     *
     * Here we will make a distinction what kind of job we will run
     * we will first slack the start of the job
     *
     * we do this by saving the job so that we have the
     * Saving the job first is very important to reflect the latest status !
     */

    // we continue with the real job either spark or nodepy

    // the rules if something is spark related, else to be executed by nodepy
    const isspark: boolean | undefined =
        (doc.type === EJobTypes.pycustom && doc.custom && doc.custom.executor === ExecutorTypes.pyspark) ||
        (doc.type === EJobTypes.params && doc.job.params?.spark?.type === 'scala') ||
        (doc.config &&
            doc.config.source &&
            doc.config.source.partition &&
            doc.config.source.partition.numpartitions > 0);

    if (isspark) {
        utils.logInfo(
            `$job.start.handler (jobStartHandler): calling spark - job: ${id} - caller: ${caller.name} - calling job: ${caller.id}`,
            doc.job.transid
        );

        doc.job.executor = ExecutorTypes.pyspark;

        // we void as this is done via socket
        try {
            const cap: ICapacity =
                doc.type === EJobTypes.params ? await createSparkScalaJob(doc) : await createSparkPythonJob(doc);

            // add to the audit trail
            doc.job.audit.spark = cap;
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $job.start.handler (jobStartHandler) - cap');

            return errHandler(err);
        }

        if (doc.config) {
            doc.job.audit.spark.config = doc.config;
        }
        if (doc.custom) {
            doc.job.audit.spark.config = doc.custom;
        }
        doc.markModified('job.audit');

        await saveDoc(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.start.handler (jobStartHandler) - save doc spark');

            return errHandler(err);
        });

        void publishSparkJob(doc.toObject());

        await jobLogger(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.start.handler (saveDoc) - jobLogger - spark');

            // we just log the error here
            return errHandler(err);
        });

        return Promise.resolve();
    }

    job.executor = 'nodepy';
    doc.job.executor = job.executor;

    // add to the audit trail
    doc.job.audit.nodepy = {
        instances: 1,
        driver_cores: 1,
    };
    if (doc.config) {
        doc.job.audit.nodepy.config = doc.config;
    }

    if (doc.stmt) {
        doc.job.audit.nodepy.stmt = doc.stmt;
    }

    if (doc.custom) {
        doc.job.audit.nodepy.custom = doc.custom;
    }

    await saveDoc(doc).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.start.handler (jobStartHandler) - save doc');

        return errHandler(err);
    });

    utils.logInfo(
        `$job.start.handler (jobStartHandler): calling nodepy - job: ${id} - caller: ${caller.name} - calling job: ${caller.id}`,
        doc.job.transid
    );

    await createNodePyJob(doc, job).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.start.handler ( createNodePyJob)');

        // we just log the error here
        return errHandler(err);
    });

    await jobLogger(doc).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.start.handler (saveDoc) - jobLogger - nodepy');

        // we just log the error here
        return errHandler(err);
    });

    return Promise.resolve();
};
