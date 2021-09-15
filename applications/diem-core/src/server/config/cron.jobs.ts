import moment from 'moment';
import { utils } from '@common/utils';
import { DataModel, IJobModel } from '@models';
import { jobStart } from '../routes/job.backend/job.start';

const getdocs: (t: number) => Promise<IJobModel[]> = async (t: number): Promise<IJobModel[]> => {
    const query: any = DataModel.find({
        'schedule.enabled': true,
        'schedule.nextExecution': { $lte: t },
    });

    const docs: IJobModel[] = await query;

    return Promise.resolve(docs);
};

export const getQueue: () => void = async (): Promise<void> => {
    const d: Date = new Date();
    const m: any = moment(d);
    const rd: any = m.startOf('minute');
    const t: number = rd.toDate().getTime();

    const docs: IJobModel[] = await getdocs(t);

    docs.forEach(async (doc: IJobModel) => {
        /** there are 3 places manual, cron and api that can trigger a job */

        const id: string = doc._id.toString();
        doc.job.transid = utils.guid();
        doc.job.email = doc.job.email || doc.annotations.createdbyemail;
        doc.job.runby = 'schedule';
        doc.job.jobid = id; // scheduled job can never be part of a pipeline

        utils.logInfo(`$cron.jobs (getQueue): scheduled job - job: ${id}`);

        await jobStart(doc);

        return Promise.resolve();
    });
};
