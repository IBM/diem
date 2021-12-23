import { utils } from '@common/utils';
import { parseExpression } from 'cron-parser';
import {
    IJobSchema,
    DataModel,
    IQuery,
    IJobModel,
    IntPayloadValues,
    EJobTypes,
    IScheduleSchema,
    FaIcons,
} from '@models';
import { fmtTime, addTrace } from '@functions';

export const StatusConfig: any = {
    Completed: {
        startbutton: false,
        statusicon: 'fa-lg fas fa-check-circle c-green',
        stopbutton: true,
    },
    Failed: {
        startbutton: false,
        statusicon: 'fa fa-lg fa-exclamation-circle c-red',
        stopbutton: true,
    },
    Pending: {
        startbutton: false,
        statusicon: 'fa fa-lg fa-circle c-yellow',
        stopbutton: true,
    },
    Running: {
        startbutton: true,
        statusicon: 'fas fa-sync fa-spin fa-lg c-gray',
        stopbutton: false,
    },
    Stopped: {
        startbutton: false,
        statusicon: 'fas fa-stop-circle fa-lg c-gray',
        stopbutton: true,
    },
    Submitted: {
        startbutton: true,
        statusicon: 'fa fa-hourglass-start fa-spin c-gray',
        stopbutton: false,
    },
};

export const PayloadValues: (job: any) => IntPayloadValues = (job: any): IntPayloadValues => {
    const config: any = StatusConfig[job.status] || {
        startbutton: false,
        statusicon: 'fa fa-question',
        stopbutton: false,
    };

    return {
        ...job,
        deleteicon: `${FaIcons.deleteicon}`,
        key: 'id', // important value to find the index of the record in the table,
        moveicon: 'fa fa-random pointer',
        runtime: fmtTime(Number(job.runtime)),
        startbutton: config.startbutton,
        starticon: `fa fa-play c-gray ${config.stopbutton ? 'pointer' : 'disabled'}`,
        statusicon: config.statusicon,
        stopbutton: config.stopbutton,
        stopicon: `fa fa-stop c-gray ${config.startbutton ? 'pointer' : 'disabled'}`,
    };
};

export const handlePayloadValues: (jdocs: IJobSchema[]) => IntPayloadValues[] = (
    docs: IJobSchema[]
): IntPayloadValues[] => {
    const payload: IntPayloadValues[] = []; // the payload return array

    docs.forEach((row: IJobSchema, i: number) => {
        let target = '';

        if (row.type === EJobTypes.pyspark && row.config?.target?.connection) {
            target = row.config.target.connection;
        } else if (row.stmt?.connection) {
            target = row.stmt.connection;
        }

        // no audit traces here
        row.job.audit = undefined;

        /* make sure the spread is at the top */
        payload[i] = PayloadValues({
            ...row.job,
            description: row.description,
            href: `/jobdetail/${row._id}`,
            id: row._id,
            jobs: row.jobs ? true : undefined,
            name: row.name,
            schedule: row.schedule && row.schedule.enabled ? 'fa fa-clock fa-lg' : '',
            source: row.config && row.config.source && row.config.source.connection ? row.config.source.connection : '',
            target,
            type: row.type,
        });
    });

    return payload;
};

export const findByFilter: (filter: any, body: IQuery) => Promise<IntPayloadValues[]> = async (
    filter: any,
    body: IQuery
): Promise<IntPayloadValues[]> => {
    const docs: IJobSchema[] = await DataModel.find(filter)
        .collation({ locale: 'en' }) // insensitive sorting
        .skip(body.first || 0)
        .limit(body.rows || 0)
        .sort({ [body.sortField || 'name']: [body.sortOrder || 1] })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.functions (findByFilter) - find');

            return Promise.reject(err);
        });

    try {
        const payload: IntPayloadValues[] = handlePayloadValues(docs); // the payload return array

        return Promise.resolve(payload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.functions (findByFilter)');

        return Promise.reject(err);
    }
};

export const countByFilter: (filter: any) => Promise<any> = async (filter: any) => {
    try {
        const docs: number = await DataModel.countDocuments(filter).exec();

        return Promise.resolve(docs);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.functions (countByFilter)');
        void utils.logError('$job.handler (countByFilter): error', err);

        return Promise.reject(err);
    }
};

export const nextSchedule: (doc: IJobModel) => IScheduleSchema = (doc: IJobModel): IScheduleSchema => {
    const cronTime: string | null = doc.schedule.cronTime;

    if (cronTime === null) {
        return {
            cronNbr: null,
            cronTime,
            enabled: false,
            lastExecution: null,
            lastExecutionTime: null,
            nextExecution: null,
            nextExecutionTime: null,
        };
    }

    const options: any = {
        currentDate: new Date(),
        utc: true,
    };

    const interval: any = parseExpression(cronTime, options);

    const next: any = interval.next();

    return {
        cronNbr: doc.schedule.cronNbr ? doc.schedule.cronNbr + 1 : 1,
        cronTime,
        enabled: doc.schedule.enabled,
        lastExecution: doc.schedule.lastExecution || null,
        lastExecutionTime: doc.schedule.lastExecutionTime || null,
        nextExecution: next.toDate().getTime(),
        nextExecutionTime: utils.time(next.toDate()),
    };
};
