import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations } from './model.common';

export interface IForms {
    _id: string;
    _rev: string;
    annotations: IJobSchemaAnnotations;
    config: {
        [index: string]: any;
    };
}

const FormsSchema: Schema = new Schema(
    {
        _id: { type: String },
        annotations: annotationsSchema,
        _rev: { type: String, required: true },
        config: { type: Object, required: true },
    },
    {
        collection: 'forms',
        strict: true,
        versionKey: false,
    }
);

export interface IFormsModel extends IForms, mongoose.Document {
    _id: string;
}

export const FormsModel = mongoose.model<IFormsModel>('forms', FormsSchema);
