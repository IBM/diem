import { cos } from './cos';
import { utils } from './utils';

export interface IPutObject extends AWS.S3.PutObjectRequest {
    Key: AWS.S3.ObjectKey;
    Body?: AWS.S3.Body;
    Bucket: AWS.S3.BucketName;
    Metadata?: AWS.S3.Metadata;
    ContentType?: AWS.S3.ContentType;
}

export interface ICos {
    ICosObj: AWS.S3.Object;
    s3Upload: (
        Key: IPutObject['Key'],
        Body: IPutObject['Body'],
        Metadata: IPutObject['Metadata'],
        Bucket: IPutObject['Bucket'],
        ContentType: IPutObject['ContentType']
    ) => Promise<AWS.S3.Object>;
    s3Delete: (Key: string, Bucket: string) => Promise<AWS.S3.DeleteObjectOutput>;
    downLoad: (Key: string, Bucket: string) => Promise<AWS.S3.GetObjectOutput>;
}

class CosFunctions {
    public s3Upload: (
        Key: IPutObject['Key'],
        Body: IPutObject['Body'],
        Metadata: IPutObject['Metadata'],
        Bucket: IPutObject['Bucket'],
        ContentType: IPutObject['ContentType']
    ) => Promise<any> = async (
        Key: IPutObject['Key'],
        Body: IPutObject['Body'],
        Metadata: IPutObject['Metadata'],
        Bucket: IPutObject['Bucket'],
        ContentType: IPutObject['ContentType']
    ): Promise<AWS.S3.Object> =>
        new Promise((resolve, reject) => {
            const params: IPutObject = {
                ContentType,
                Metadata,
                Key,
                Bucket,
                Body,
            };

            /**
             * we remove these options as the default should be ok
             * the default is 4 concurrent and 5M , the coption below is 10 MB with just 1 concurrent
             * const options: AWS.S3.ManagedUpload.ManagedUploadOptions = { partSize: 10 * 1024 * 1024, queueSize: 1 };
             */

            const upload: AWS.S3.ManagedUpload = cos.upload(params);

            const promise: Promise<any> = upload.promise();

            promise
                .then((data: AWS.S3.Object) => {
                    resolve(data);
                })
                .catch(async (err: any) => {
                    err.caller = '$cos.functions';
                    err.trace = [`@at $cos.functions (s3Upload) - ${utils.time()}`];

                    reject(err);
                });
        });

    public s3Delete: (Key: string, Bucket: string) => Promise<AWS.S3.DeleteObjectOutput> = async (
        Key: string,
        Bucket: string
    ): Promise<AWS.S3.DeleteObjectOutput> =>
        new Promise((resolve, reject) => {
            const params: AWS.S3.DeleteObjectRequest = {
                Bucket,
                Key,
            };

            const promise: any = cos.deleteObject(params).promise();

            promise
                .then((data: AWS.S3.DeleteObjectOutput) => {
                    resolve(data);
                })
                .catch(async (err: any) => {
                    err.caller = '$cos.functions';
                    err.trace = [`@at $cos.functions (s3Delete) - ${utils.time()}`];

                    reject(err);
                });
        });

    public downLoad: (Key: string, Bucket: string) => Promise<AWS.S3.GetObjectOutput> = async (
        Key: string,
        Bucket: string
    ): Promise<AWS.S3.GetObjectOutput> =>
        new Promise((resolve, reject) => {
            cos.getObject(
                {
                    Bucket,
                    Key,
                },
                (err: any, response: AWS.S3.GetObjectOutput) => {
                    if (err) {
                        err.trace = [`@at $cos.functions (download) - ${utils.time()}`];

                        return reject(err);
                    }
                    resolve(response);
                }
            );
        });
}

export const cosFunctions: CosFunctions = new CosFunctions();
