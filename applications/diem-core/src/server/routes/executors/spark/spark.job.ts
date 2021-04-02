/* eslint-disable max-len */

import { ICrdConfig } from 'routes/spark-operator/base.crd';
import { utils } from '@common/utils';
import { Credentials } from '@common/cfenv';
import { IModel, IConfigmapsModel } from '@models';
import { INatsMessage } from '@interfaces';
import { addTrace } from '../../shared/functions';
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

export interface ICapacity {
    instances: number;
    driver_cores: number;
    driver_memory: string;
    executor_cores: number;
    executor_memory: string;
    nodes: number;
}

interface INats {
    password: string;
    user: string;
    ip: string;
    port?: string;
}

export const getNatsConfig: () => Promise<INatsMessage> = async (): Promise<INatsMessage> => {
    const nats: INats = Credentials('nats');

    return {
        url: `${nats.user}:${nats.password}@${nats.ip}:${nats.port || '4222'}`,
        channel: 'core.job',
        client: 'pyspark',
    };
};

export const getCosCredentials: (doc: IModel) => Promise<Partial<ICos>> = async (
    doc: IModel
): Promise<Partial<ICos>> => {
    let credentials: Partial<ICos> = {};

    const org: string = doc.project.org;
    const id: string = doc._id.toString();

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

    utils.logInfo(`$spark.scala (createSparkScalaJob): mounting volume - volume: ${volume} - name: ${volumename}`);

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
