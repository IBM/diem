import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations } from './model.common';

export interface IOrgsBody {
    description: string;
    email: string;
    id?: string;
    sessionid?: string;
    Org: string;
    transid: string;
    username: string;
    org: string;
    config: string;
    store: string;
}

export interface IOrg {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    org: string;
    config: {
        [index: string]: any;
    };
}

const OrgsSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        description: String,
        org: { type: String, index: true, required: true, unique: true },
        config: Object,
    },
    {
        collection: 'orgs',
        strict: true,
        versionKey: false,
    }
);

export interface IOrgsModel extends IOrg, mongoose.Document {
    _id: string;
}

export const OrgsModel = mongoose.model<IOrgsModel>('orgs', OrgsSchema);
