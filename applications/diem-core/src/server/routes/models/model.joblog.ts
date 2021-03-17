import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { projectSchema } from './model.common';

export interface IJobLog {
    count: number | null;
    email: string;
    error?: string | null;
    executor: string;
    jobend: Date | null;
    jobid?: string;
    jobstart: Date;
    logid: string;
    name: string;
    params?: any;
    project: {
        org: string;
        orgscope: string;
    };
    runby: string;
    runtime: number | null;
    status: string;
    type: string;
    transid: string;
    nbr?: number;
    statusicon?: string;
    out?: any[] | string;
    outicon?: string;
    erroricon?: string;
}

const jobLogSchema: Schema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        logid: { type: String, required: true },
        count: Number,
        email: String,
        error: String,
        executor: String,
        jobend: Date,
        jobid: String,
        jobstart: { type: Date, required: true, index: true },
        name: String,
        params: Object,
        project: projectSchema,
        runby: String,
        runtime: Number,
        status: String,
        type: String,
        transid: { type: String, required: true, default: 'noop' },
    },
    {
        collection: 'joblog',
        strict: true,
        versionKey: false,
    }
);

export interface IJobLogModel extends IJobLog, mongoose.Document {
    _id: string;
}

export const JobLogModel = mongoose.model<IJobLogModel>('joblog', jobLogSchema);
