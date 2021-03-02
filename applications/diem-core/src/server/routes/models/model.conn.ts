import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';
import { annotationsSchema, EIdType, IJobSchemaAnnotations, projectSchema } from './model.common';

export interface IConnSchema {
    _id: string;
    alias: string;
    annotations: IJobSchemaAnnotations;
    cert?: string;
    description: string;
    jdbc: string;
    owner?: string;
    password: string;
    project: {
        org: string;
        orgscope: string;
    };
    idtype: EIdType;
    type: string;
    user: string;
    expires?: Date | null;
}

export interface IConnBody extends IConnSchema {
    id?: string;
    email: string;
    username: string;
    transid: string;
    org: string;
    orgscope: string;
}

const connSchema: Schema = new Schema(
    {
        alias: String,
        annotations: annotationsSchema,
        cert: String,
        description: String,
        expires: Date,
        jdbc: String,
        owner: String,
        password: String,
        idtype: { type: String },
        project: projectSchema,
        type: String,
        user: String,
    },
    {
        collection: 'connection',
        strict: true,
        versionKey: false,
    }
);

export interface IConnModel extends IConnSchema, mongoose.Document {
    _id: string;
}

export const ConnModel = mongoose.model<IConnModel>('connection', connSchema);
