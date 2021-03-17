import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations, projectSchema } from './model.common';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

type IIdtype = 'personal' | 'functional';

export interface IWebhookPayload {
    createdby: string;
    createddate: string;
    deleteicon?: string;
    description: string;
    editicon?: string;
    idtype: IIdtype;
    id: string;
    name: string;
    org: string;
    owner?: string;
    selector: string;
    viewicon: string;
    webhook: string;
    webhookid: string;
    lock?: string;
}

export interface IWebhooksBody {
    description: string;
    email: string;
    id?: string;
    idtype: IIdtype;
    name: string;
    sessionid?: string;
    webhook: string;
    transid: string;
    username: string;
    org?: string;
    selector: string;
    store: string;
}

export interface IWebhooksSchema {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    name: string;
    project: {
        org: string;
        orgscope?: string;
    };
    webhook: string;
    idtype: IIdtype;
    selector: string;
    owner?: string;
}

const webhooksSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        description: String,
        idtype: { type: String },
        name: { type: String, required: true },
        owner: String,
        project: projectSchema,
        selector: { type: String, required: true },
        webhook: { type: String, required: true },
    },
    {
        collection: 'webhooks',
        strict: true,
        versionKey: false,
    }
);

webhooksSchema.index({ 'project.org': 1, _id: 1 });
webhooksSchema.index({ 'project.org': 1, selector: 1 });

export interface IWebhooksModel extends IWebhooksSchema, mongoose.Document {
    _id: string;
}

export const WebhooksModel = mongoose.model<IWebhooksModel>('webhooks', webhooksSchema);
