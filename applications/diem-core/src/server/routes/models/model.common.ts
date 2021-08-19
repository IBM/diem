import { mongoose } from '@common/mongo';
import { IntServerPayload } from '@interfaces';
export const newObjectId: () => mongoose.Types.ObjectId = () => mongoose.Types.ObjectId();
import { Schema } from 'mongoose';

export interface ISocketPayload extends IntServerPayload {
    org: string;
}

export interface IJobSchemaAnnotations {
    createdbyemail: string;
    createdbyname: string;
    createddate: Date;
    modifiedbyemail: string;
    modifiedbyname: string;
    modifieddate: Date;
    transid: string;
}

export interface IUserPayload {
    email: string;
    payload: any;
}

export interface IQuery {
    email?: string;
    first?: number;
    jobid?: string;
    id?: string;
    mine?: boolean;
    org?: string;
    reference?: string;
    role?: string;
    rolenbr?: number;
    rows?: number;
    scheduled?: boolean;
    search?: string;
    sortField?: string;
    sortOrder?: number;
    status?: string;
    user?: string;
    tags?: string[];
    tagstype?: string;
    type?: string;
    transid?: string;
}

export const enum EIdType {
    personal = 'personal',
    functional = 'functional',
}

export const annotationsSchema: Schema = new Schema(
    {
        createdbyemail: { type: String, required: true, index: true },
        createdbyname: { type: String, required: true },
        createddate: { type: Date, default: Date.now },
        modifiedbyemail: { type: String, required: true },
        modifiedbyname: { type: String, required: true },
        modifieddate: { type: Date, default: Date.now },
        transid: { type: String, required: true, default: 'noop' },
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export const projectSchema: Schema = new Schema(
    {
        org: { type: String, index: true, required: true, unique: true },
        orgscope: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);
