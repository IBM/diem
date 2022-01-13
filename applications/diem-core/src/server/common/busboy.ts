/* eslint-disable class-methods-use-this */
import busboy from 'busboy';
import { IError, IFile, IRequest } from '../interfaces/shared';

export class MultiPart {
    public parseMulti = async (req: IRequest): Promise<any> =>
        new Promise((resolve, reject) => {
            const busb: busboy.Busboy = busboy({ headers: req.headers });

            busb.on('file', (_fieldname: string, file: any, name: string, encoding: string, mimetype: string) => {
                const chunk: Buffer[] = [];
                file.on('data', (data: any) => {
                    chunk.push(data);
                });
                file.on('end', () => {
                    const f: IFile = {
                        data: Buffer.concat(chunk),
                        encoding,
                        name,
                        type: mimetype,
                    };

                    if (req.files) {
                        req.files.push(f);
                    } else {
                        req.files = [f];
                    }
                });
            });

            busb.on('field', (_fieldname: string, val: any) => {
                try {
                    req.body = JSON.parse(val);
                } catch (err) {
                    /* ' lets remove this code and do nothing
                    err.location = 'busboy parse error';

                    return reject(err);
                    */
                }
            });

            busb.on('finish', () => {
                resolve(true);
            });

            busb.on('error', (err: IError) => {
                err.location = 'busboy error';

                return reject(err);
            });

            req.pipe(busb);
        });
}

export const multipart: MultiPart = new MultiPart();
