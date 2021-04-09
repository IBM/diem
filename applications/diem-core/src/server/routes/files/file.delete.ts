import { utils } from '@common/utils';
import { EStoreActions, IError, IntServerPayload, IRequest } from '@interfaces';
import { cosFunctions } from '@common/cos.functions';
import { pubSub } from '@config/pubsub';
import { addTrace } from '@functions';
import { getBucket } from './files';

export const filedelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: any = process.hrtime();
    const body: { id: string; store: string } = { ...req.body };
    const Bucket: string = getBucket(req);

    try {
        await cosFunctions
            .s3Delete(body.id, Bucket)
            .then(async (data: AWS.S3.DeleteObjectOutput) => Promise.resolve(data))
            .catch(async (err: IError) => {
                err.trace = addTrace(err.trace, '@at $file.delete (filedelete)');

                return Promise.reject(err);
            });

        utils.logInfo(`$cos.doc (cosDelete) - bucket ${Bucket}`, req.transid, process.hrtime(hrstart));

        /** @todo add some logging */
    } catch (err) {
        return Promise.reject({
            ...err,
            location: 'cosupload',
            trace: [`@at $cos (remove) - ${utils.time()}`],
        });
    }

    const payload: IntServerPayload = {
        email: req.user.email, // this for the user
        message: `File ${body.id} Deleted`,
        payload: [
            {
                key: 'id',
                loaded: true,
                store: body.store /** not used as forcestore is enabled */,
                type: EStoreActions.REM_STORE_RCD,
                values: {
                    id: body.id,
                },
            },
        ],
        success: true /** just display a success message */,
    };

    pubSub.publishUserPayload({
        email: req.user.email,
        payload,
    });

    return Promise.resolve({ success: true });
};
