import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { cos } from '@common/cos';
import { S3 } from 'ibm-cos-sdk';
import { FaIcons } from '@models';

const viewSecurity: number = 60;
const editSecurity: number = 60;

interface IFilePayload {
    createdby: string;
    createddate: string;
    deleteicon?: string;
    editicon?: string;
    id: string;
    name: string;
    org: string;
    selector: string;
    downloadicon: string;
    file: string;
    type: string;
    size: number;
}

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const getName: (name: string | undefined) => string = (name: string | undefined) => {
    if (!name) {
        return '';
    }

    const array: string[] = name.split('/');

    return array[array.length - 1];
};

export const getBucket: (req: IRequest) => string = (req: IRequest): string =>
    `${utils.Env.packname}-${utils.Env.K8_SYSTEM}-${req.user.org}`;

export const getBucketOrg: (org: string) => string = (org: string): string =>
    `${utils.Env.packname}-${utils.Env.K8_SYSTEM}-${org}`;

export const loadFiles: () => Promise<any[]> = async (): Promise<any[]> => {
    const docs: any = await cos.listBuckets().promise();

    return Promise.resolve(docs);
};

export const getfiles: (req: IRequest) => Promise<IFilePayload[]> = async (req: IRequest): Promise<IFilePayload[]> => {
    const hrstart: [number, number] = process.hrtime();
    const Bucket: string = getBucket(req);

    const role: string = req.user.role;

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$connections (connections): not allowed - email: ${req.user.email} - role: ${role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.reject({
            status: 200,
            return: [
                {
                    name: `You don't have enough rights to view files. Your role level: ${req.user.rolenbr} - required: ${viewSecurity}`,
                },
            ],
        });
    }

    const body: { selector: string } = { ...req.body };

    let response: S3.ListObjectsV2Output | null | undefined = {};

    response = await cos
        .listObjectsV2({
            Bucket,
            Delimiter: '/',
            Prefix: body.selector,
            //Prefix: '',
        })
        .promise()
        .catch(async (err3) => {
            err3.bucket = Bucket;
            err3.trace = ['@at $files (listObjectsV2) - listbuckets'];

            if (err3 && ['NetworkingError', 'InvalidAccessKeyId'].includes(err3.code)) {
                void utils.logError('$files (getfiles): connection error', err3);

                return Promise.reject({
                    status: 200,
                    return: [
                        {
                            name: 'A network error hoppened',
                        },
                    ],
                });
            }

            if (err3 && ['NoSuchBucket'].includes(err3.code)) {
                void utils.logInfo(`$files (getfiles): creating bucket : ${Bucket}`);
                const bucket: any = await cos
                    .createBucket({
                        Bucket,
                        CreateBucketConfiguration: { LocationConstraint: process.env.COSCONTAINER || 'us-south-smart' },
                    })
                    .promise()
                    .catch(async (err4) => {
                        err4.bucket = Bucket;
                        err4.trace = ['@at $files (getfiles) - createbucket'];

                        return Promise.reject(err4);
                    });

                return Promise.resolve(bucket);
            } else {
                void utils.logError('$files (getfiles): connection error', err3);

                return Promise.reject({
                    status: 200,
                    return: [
                        {
                            name: 'A network error hoppened',
                        },
                    ],
                });
            }
        });

    utils.logInfo(
        `$files (files) - bucket: ${Bucket} - email: ${req.user.email} - org: ${req.user.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    utils.logInfo(
        `$files (files) - email: ${req.user.email} - org: ${req.user.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IFilePayload[] = [];

    if (!response) {
        return Promise.resolve(payload);
    }

    if (!response.Contents) {
        return Promise.resolve(payload);
    }

    response.Contents.forEach((file: S3.Object, i: number) => {
        payload[i] = {
            createdby: 'cos',
            createddate: file.LastModified ? file.LastModified.toISOString() : new Date().toISOString(),
            id: file.Key || '',
            file: file.Key || '',
            name: getName(file.Key),
            org: req.user.org,
            downloadicon: `${FaIcons.downloadicon}`,
            selector: body.selector,
            size: file.Size || 0,
            type: 'application/octet-stream',
        };

        if (req.user.rolenbr >= editSecurity) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
        }
    });

    return Promise.resolve(payload);
};
export const listbuckets: (req: IRequest) => Promise<IFilePayload[]> = async (
    req: IRequest
): Promise<IFilePayload[]> => {
    const hrstart: [number, number] = process.hrtime();

    const role: string = req.user.role;

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$connections (connections): not allowed - email: ${req.user.email} - role: ${role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve([]);
    }

    const response: S3.ListBucketsOutput = await cos.listBuckets().promise();

    utils.logInfo(
        `$files (files) - email: ${req.user.email} - org: ${req.user.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IFilePayload[] = [];

    if (!response) {
        return Promise.resolve(payload);
    }

    return Promise.resolve([]);
};
