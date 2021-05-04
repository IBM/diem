export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';
export { IJobSchemaAnnotations } from './model.common';

export * from './model.common';
export * from './model.configmaps';
export * from './model.conn';
export * from './model.job';
export * from './model.joblog';
export * from './model.org';
export * from './model.profile';
export * from './model.profiles';
export * from './model.snippets';
export * from './model.tags';
export * from './model.templates';
export * from './model.webhooks';
export * from './model.files';
export * from './model.logger';
export * from './model.forms';
export * from './model.webapikeys';

export enum FaIcons {
    viewicon = 'fas fa-binoculars pointer',
    editicon = 'fa fa-edit pointer',
    deleteicon = 'fa fa-trash pointer c-red',
    downloadicon = 'fas fa-download pointer c-gray',
}

export type TParameters = [
    'config',
    'configmaps',
    'connections',
    'files',
    'mail',
    'pip',
    'pipeline',
    'slack',
    'spark',
    'values'
];
