import { IntMQLogBase } from '@interfaces';
import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';

const annotationsSchema: Schema = new Schema(
    {
        profile: {
            email: String,
            name: String,
        },
        execution: {
            msec: Number,
            sec: Number,
        },
        org: String,
        transid: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

const requestSchema: Schema = new Schema(
    {
        body: Object,
        params: Object,
        query: String,
        url: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

const loggerSchema: Schema = new Schema(
    {
        logid: { type: String, required: true, index: true },
        created: { type: Date, required: true, index: true },
        annotations: annotationsSchema,
        browser: Object,
        err: Object,
        event: String,
        module: Object,
        request: requestSchema,
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
