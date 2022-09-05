import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { projectSchema } from './model.common';

interface IJobLogSchema {
    count: number | null;
    email: string;
    error?: string | null;
    executor: string;
    jobend: Date | null;
    jobid?: string;
    jobstart: Date | null;
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
    transid: string;
    type: string;
}

export interface IJobLog extends IJobLogSchema {
    nbr?: number;
    statusicon?: string;
    out?: any[] | string;
    outicon?: string;
    erroricon?: string;
    audit?: any;
    auditicon?: string;
}

const jobLogSchema: Schema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        count: Number,
        email: String,
        error: String,
        executor: String,
        jobend: Date,
        jobid: String,
        jobstart: { type: Date, required: true },
        logid: { type: String, required: true },
        name: String,
        params: Object,
        project: projectSchema,
        runby: String,
        runtime: Number,
        status: String,
        transid: { type: String, required: true, default: 'noop' },
        type: String,
    },
    {
        collection: 'joblog',
        strict: true,
        versionKey: false,
    }
);

export interface IJobLogModel extends IJobLogSchema, mongoose.Document {
    _id: string;
}

export const JobLogModel = mongoose.model<IJobLogModel>('joblog', jobLogSchema);
