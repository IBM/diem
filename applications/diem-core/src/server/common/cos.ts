import AWS from 'ibm-cos-sdk';
import { Credentials } from './cfenv';

interface ICfg {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
}

class Cos {
    public cos: AWS.S3;

    public constructor() {
        const cosCfg: ICfg = Credentials('COS');

        this.cos = new AWS.S3(cosCfg);
    }
}

export const cos: AWS.S3 = new Cos().cos;

export interface ICos extends AWS.S3 {
    ICosObj: AWS.S3.Object;
}
