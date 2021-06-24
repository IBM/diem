import { IExpressConfig } from '@common/express';

export const css: any = [];

export const expressConfig: IExpressConfig = {
    BODYPARSER_JSON_LIMIT: '15mb',
    BODYPARSER_URLENCODED_LIMIT: '15mb',
    cspApiIncluded: ['/user/', '/api'],
    cspExcluded: ['/user/', '/api'],
    featurePolicyApiIncluded: ['/api'],
    unsafecss: true,
};
