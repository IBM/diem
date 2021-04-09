/* eslint-disable @typescript-eslint/quotes */
import { IModel, EJobTypes } from '@models';
import { utils } from '@common/utils';
import { IError } from '@interfaces';
import { addTrace } from '@functions';
import { handleMail } from '../mail/handle.mail';
import { toSlack } from './slack.logger';
import { logLogger } from './log.logger';

export const jobLogger: (doc: IModel) => Promise<void> = async (doc: IModel): Promise<void> => {
    // slack can continue, but if there's an error we will log it
    void toSlack(doc).catch((err: IError) => {
        err.trace = addTrace(err.trace, '@at $job.logger (jobLogger)');

        utils.emit('error', err);
    });

    if (['Failed', 'Completed', 'Stopped'].includes(doc.job.status) && doc.type !== EJobTypes.pipeline) {
        void logLogger(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.logger (jobLogger) - logLogger');

            utils.emit('error', err);
        });
    }

    if (['Completed', 'Failed'].includes(doc.job.status)) {
        // mailhandler has it's own logging
        void handleMail(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.logger (jobLogger) - handleMail');

            utils.emit('error', err);
        });
    }

    return Promise.resolve();
};
