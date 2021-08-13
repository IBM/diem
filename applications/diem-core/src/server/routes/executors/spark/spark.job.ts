import { ICrdConfig } from 'routes/spark-operator/base.crd';
import { utils } from '@common/utils';
import { Credentials } from '@common/cfenv';
import { IJobSchema, IConfigmapsModel } from '@models';
import { addTrace } from '@functions';
import { spark } from '../../spark-operator/spark.base';
import { getConfigmap } from '../nodepy/python/python.code.handlers/handle.configmaps';

export interface ICos {
    endpoint: string;
    apiKeyId?: string;
    accessKeyId?: string;
    secretAccessKey: string;
    ibmAuthEndpoint: string;
    serviceInstanceId: string;
    bucket: string;
}

export const getCosCredentials: (doc: IJobSchema) => Promise<Partial<ICos>> = async (
    doc: IJobSchema
): Promise<Partial<ICos>> => {
    let credentials: Partial<ICos> = {};

    const org: string = doc.project.org;
    const id: string = doc._id;

    if (doc.job?.params?.files && typeof doc.job.params.files !== 'boolean' && doc.job.params.files.cos) {
        const cos: string = doc.job.params.files.cos;
        const configmap: IConfigmapsModel | null = await getConfigmap(cos, org);

        if (configmap) {
            credentials = configmap.configmap;
            utils.logInfo(`$spark.scala (getCosCredentials): using configmap: ${cos} - job: ${id}`);
        } else {
            utils.logInfo(`$spark.scala (getCosCredentials): error finding configmap: ${cos} - job: ${id}`);
        }
    } else {
        credentials = Credentials('COS');
        utils.logInfo(`$spark.scala (getCosCredentials):using org configmap - job: ${id} - org: ${org}`);
    }

    return credentials;
};

export const deleteJob: (id: string) => Promise<any> = async (id: string): Promise<any> => {
    try {
        await spark.deletePod(id);

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $spark.job (deleteJob)');
        err.id = id;

        return Promise.reject(err);
    }
};

export const addVolume: (crdjob: ICrdConfig, volume: string) => ICrdConfig = (
    crdjob: ICrdConfig,
    volume: string
): ICrdConfig => {
    const volumename: string = 'spark-local-dir-1';
    const filepath: string = '/tmp/spark-local-dir';

    utils.logInfo(`$spark.job (addVolume): mounting volume - volume: ${volume} - name: ${volumename}`);

    crdjob.spec.volumes = [
        {
            name: volumename,
            persistentVolumeClaim: {
                claimName: volume,
            },
        },
    ];

    crdjob.spec.driver.volumeMounts = [
        {
            name: volumename,
            mountPath: filepath,
        },
    ];

    crdjob.spec.executor.volumeMounts = [
        {
            name: volumename,
            mountPath: filepath,
        },
    ];

    crdjob.spec.driver.envVars.FILEPATH = filepath;

    return crdjob;
};
