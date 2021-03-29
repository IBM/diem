import { utils } from '@common/utils';
import { IRequest, IFile, EStoreActions, IntServerPayload, IError } from '@interfaces';
import { cosFunctions, ICos, IPutObject } from '@common/cos.functions';
import { IFilesBody, FaIcons } from '@models';
import { pubSub } from '@config/pubsub';
import { addTrace } from '../shared/functions';
import { getName, getBucket } from './files';

interface ICosFileMeta {
    [index: string]: any;
    transid: string;
    created: string;
}

const cosUpload: (params: IPutObject) => Promise<ICos['ICosObj']> = async (
    params: IPutObject
): Promise<ICos['ICosObj']> =>
    new Promise((resolve, reject) => {
        const hrstart: any = process.hrtime();

        cosFunctions
            .s3Upload(params.Key, params.Body, params.Metadata, params.Bucket, params.ContentType)
            .then((data: ICos['ICosObj']) => {
                utils.logInfo('$cos (cosUpload)', params.Key, process.hrtime(hrstart));
                resolve(data);
            })
            .catch((err: IError) => {
                err.trace = [`@at $cos.functions (s3Upload): ${params.Bucket} `];

                reject(err);
            });
    });

const uploadFiles: (req: IRequest) => Promise<void> = async (req: IRequest): Promise<void> => {
    if (!req.files) {
        return;
    }

    const body: IFilesBody = { ...req.body };
    const Bucket: string = getBucket(req);

    req.files.forEach(async (file: IFile) => {
        const meta: ICosFileMeta = {
            created: new Date().toISOString(),
            transid: req.transid,
        };

        const upload: IPutObject = {
            Body: file.data,
            Metadata: meta,
            Bucket,
            Key: file.name,
            ContentEncoding: file.encoding,
            ContentType: file.type,
        };

        try {
            await cosUpload(upload);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $file.upload (uploadFiles)');

            utils.logInfo(`$file.upload (uploadFiles) - email: ${body.email}`, err);

            return pubSub.publishClientPayload({
                clientEmail: req.user.email,
                payload: [{ message: 'file upload failed', email: req.user.email, success: false }],
            });
        }

        // return Promise.resolve(metaReturn);

        const payload: IntServerPayload = {
            email: req.user.email,
            message: `file ${file.name} Uploaded`,
            payload: [
                {
                    key: 'id',
                    loaded: true,
                    store: body.store /** not used as forcestore is enabled */,
                    type: EStoreActions.ADD_STORE_RCD,
                    values: {
                        createdby: 'cos',
                        createddate: file.LastModified ? file.LastModified.toISOString() : new Date().toISOString(),
                        id: file.name,
                        file: file.name,
                        name: getName(file.name),
                        org: req.user.org,
                        downloadicon: `${FaIcons.downloadicon}`,
                        selector: body.selector,
                        size: file.data.length || 0,
                        type: file.type,
                        deleteicon: `${FaIcons.deleteicon}`,
                    },
                },
            ],
            success: true /** just display a success message */,
        };

        pubSub.publishClientPayload({
            clientEmail: req.user.email,
            payload,
        });
    });
};

export const fileupload: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IFilesBody = { ...req.body };

    body.email = req.user.email;

    if (!req.files) {
        return Promise.reject({
            message: 'No files have been provided',
            location: 'cosupload',
            trace: [`@at $cos (no-files) - ${utils.time()}`],
        });
    }

    void uploadFiles(req);

    utils.logInfo(`$files (filedelete): file updated - email: ${body.email}`, req.transid, process.hrtime(hrstart));

    return Promise.resolve({
        message: 'files Upload Started',
        success: true /** just display a success message */,
    });
};
