import { IntMQLogBase } from '@interfaces';
import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';

const loggerSchema: Schema = new Schema(
    {
        _id: { type: String, auto: false, required: true },
        annotations: {
            profile: {
                email: String,
                name: String,
            },
            time: String,
            transid: String,
            execution: {
                msec: Number,
                sec: Number,
            },
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
