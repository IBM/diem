import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { cosFunctions } from '@common/cos.functions';
import { getBucket, getName } from './files';

export const filedownload: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> =>
    new Promise((resolve, reject) => {
        const hrstart: any = process.hrtime();
        const body: any = { ...req.body };
        const Bucket: string = getBucket(req);

        cosFunctions
            .downLoad(body.id, Bucket)
            .then((resp: AWS.S3.GetObjectOutput) => {
                utils.logInfo(
                    `$attachments (getattachment): fileid ${body.fileid}`,
                    body.transid,
                    process.hrtime(hrstart)
                );
                // 'const t: any = resp.Body.toString('binary');
                resolve({
                    filename: getName(body.id),
                    contenttype: resp.ContentType,
                    data: resp.Body ? resp.Body.toString('binary') : '',
                });
            })
            .catch((err: Error) => {
                reject({
                    location: '$getattachmenbt',
                    ...err,
                });
            });
    });
