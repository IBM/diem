import { IntMQLogBase } from '@interfaces';
import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';

const loggerSchema: Schema = new Schema(
    {
        logid: { type: String, required: true, index: true },
        created: { type: Date, required: true, index: true },
        annotations: {
            profile: {
                email: String,
                name: String,
            },
            execution: {
                msec: Number,
                sec: Number,
            },
            org: String,
        },
        browser: {
            agent: String,
            ip: String,
        },
        err: Object,
        event: String,
        module: Object,
        request: {
            body: Object,
            params: Object,
            query: String,
            url: String,
        },
        status: Number,
        type: String,
    },
    {
        collection: 'logger',
        strict: true,
        versionKey: false,
    }
);

export interface ILoggerModel extends IntMQLogBase, mongoose.Document {
    _id: string;
}

export const loggerModel = mongoose.model<ILoggerModel>('logger', loggerSchema);
