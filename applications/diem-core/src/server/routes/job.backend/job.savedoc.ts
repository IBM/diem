/* eslint-disable @typescript-eslint/indent */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { utils } from '@common/utils';

import { IModel } from '@models';

import { addTrace } from '@functions';
import { nextSchedule } from './job.functions';

export const saveDoc: (doc: IModel) => Promise<boolean> = async (doc: IModel): Promise<boolean> => {
    const id: string = doc._id.toString();
    if (doc.schedule && doc.schedule.enabled) {
        doc.schedule = { ...nextSchedule(doc) };
        utils.logInfo(
            `$job.start (saveDoc) - calculating schedule - job: ${id} - next run: ${doc.schedule.nextExecutionTime}`,
            doc.job.transid
        );
    }

    doc.job.jobstart = new Date();
    doc.job.runtime = null;
    doc.job.count = null;
    doc.job.jobend = null;
    doc.job.error = null;
    doc.out = [];

    // doc.markModified('job');

    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $job.start.handler (saveDoc) - save');
        err.doc = id;

        return Promise.reject(err);
    });

    return Promise.resolve(true);
};
