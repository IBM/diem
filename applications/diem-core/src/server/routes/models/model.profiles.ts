import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema } from './model.common';

export enum EUserRoles {
    admin = 'admin',
    dbadmin = 'dbadmin',
    depositor = 'depositor',
    editor = 'editor',
    editor_np = 'editor-np',
    manager = 'manager',
    reader = 'reader',
}

export enum EUserRolesNbr {
    admin = 100,
    manager = 80,
    editor = 60,
    dbadmin = 40,
    editor_np = 20,
    depositor = 10,
    reader = 1,
    noaccess = 0,
}

export interface IProfileBody {
    email: string;
    id: string;
    org: string;
    role: string;
    rolenbr: number;
    store: string;
    transid: string;
    user: string;
    username: string;
}

export interface IProfilesBody {
    first: number;
    id: string;
    org: string;
    role: string;
    rolenbr: number;
    rows: number;
    transid: string;
    user: string;
}

interface IUserSchemaAnnotations {
    createdbyemail: string;
    createdbyname: string;
    createddate: Date;
    modifiedbyemail: string;
    modifiedbyname: string;
    modifieddate: Date;
    transid: string;
}

export interface IUserSchema {
    _id: string;
    annotations: IUserSchemaAnnotations;
    email: string;
    org: string;
    role: string;
}

export interface ProfilePayloadValues {
    createddate: Date;
    deleteicon?: string;
    editicon?: string;
    email: string;
    id: string;
    org: string;
    role: string;
}

const userSchema: Schema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        annotations: annotationsSchema,
        email: { type: String, index: true, required: true, unique: true },
        org: String,
        role: String,
    },
    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

userSchema.index({ email: 1, org: 1 });

export interface IUserModel extends IUserSchema, mongoose.Document {
    _id: string;
}

export const UserModel = mongoose.model<IUserModel>('users', userSchema);
