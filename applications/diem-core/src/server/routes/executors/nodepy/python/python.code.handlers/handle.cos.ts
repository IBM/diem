import { Credentials } from '@common/cfenv';
import { IParamsFiles } from '@models';
import { getBucketOrg } from '../../../../files/files';
import { getConfigmap } from './handle.configmaps';

interface ICos {
    endpoint: string;
    apiKeyId: string;
    ibmAuthEndpoint: string;
    serviceInstanceId: string;
    bucket: string;
}

export const handleCos: (code: string, org: string, files: boolean | IParamsFiles) => Promise<string> = async (
    code: string,
    org: string,
    files: boolean | IParamsFiles
): Promise<string> => {
    let credentials: Partial<ICos> = {};

    const cosid: string | undefined = typeof files !== 'boolean' && files.cos ? files.cos : undefined;
    let filename: string = '';

    if (cosid) {
        const doc = await getConfigmap(cosid, org);

        if (doc && doc.configmap) {
            credentials = doc.configmap;
        }
    } else {
        credentials = Credentials('COS');
        credentials.bucket = getBucketOrg(org);
    }

    if (typeof files !== 'boolean' && files.bucket) {
        credentials.bucket = files.bucket;
    }

    if (typeof files !== 'boolean' && files.filename) {
        filename = `files_filename = '${files.filename}'`;
    }

    const file_part: string = String.raw`
from diemlib.filehandler import filehandler,savePandas

cos = filehandler(
    {
        "__ibm_api_key_id" : "${credentials.apiKeyId}",
        "__ibm_service_instance_id" : "${credentials.serviceInstanceId}",
        "__endpoint_url" : "https://${credentials.endpoint}",
        "__Bucket" : "${credentials.bucket}"
    }
)

${filename}

######`;

    return Promise.resolve(`${code.replace('######', file_part)}`);
};
