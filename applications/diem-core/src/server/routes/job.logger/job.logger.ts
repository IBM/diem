/* eslint-disable @typescript-eslint/quotes */
import { IModel, EJobTypes } from '../models/models';
import { addTrace } from '../shared/functions';
import { handleMail } from '../mail/handle.mail';
import { toSlack } from './slack.logger';
import { logLogger } from './log.logger';

export const jobLogger: (doc: IModel) => Promise<void> = async (doc: IModel): Promise<void> => {
    try {
        await toSlack(doc);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.logger (jobLogger)');

        return Promise.reject(err);
    }

    if (['Failed', 'Completed', 'Stopped'].includes(doc.job.status) && doc.type !== EJobTypes.pipeline) {
        await logLogger(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.logger (jobLogger) - logLogger');

            return Promise.reject(err);
        });
    }

    if (['Completed', 'Failed'].includes(doc.job.status)) {
        // mailhandler has it's own logging
        await handleMail(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.logger (jobLogger) - handleMail');

            return Promise.reject(err);
        });
    }

    return Promise.resolve();
};
