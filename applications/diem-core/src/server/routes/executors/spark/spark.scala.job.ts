/* eslint-disable max-len */
import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IJobSchema } from '@models';
import { pubSub } from '@config/pubsub';
import { addTrace } from '@functions';
import { ICapacity } from '@interfaces';
import { crdconfig, ICrdConfig } from '../../spark-operator/base.crd';
import { spark, sparkCredentials } from '../../spark-operator/spark.base';
import { caclCap } from '../../spark-operator/spark.capacity';
import { sparkWatcher } from '../../spark-operator/spark.watcher';
import { getConfigmap } from '../nodepy/python/python.code.handlers/handle.configmaps';
import { addVolume, getCosCredentials, ICos } from './spark.job';

const stocator: string = '/opt/cos/stocator-1.1.3.jar';
const encoder: string = '-Ddb2.jcc.charsetDecoderEncoder=3';

interface IEnvVars {
    [index: string]: string;
}

const getEnvVars: (org: string, configmaps: string | string[]) => Promise<IEnvVars> = async (
    org: string,
    configmaps: string | string[]
): Promise<IEnvVars> => {
    let envVars: IEnvVars = {};

    if (Array.isArray(configmaps)) {
        // eslint-disable-next-line guard-for-in
        for await (const configmap of configmaps) {
            const doc = await getConfigmap(configmap, org);

            if (doc?.configmap) {
                envVars = { ...envVars, ...doc.configmap };
            }
        }
    } else if (typeof configmaps === 'string') {
        const doc = await getConfigmap(configmaps, org);

        if (doc && doc.configmap) {
            envVars = { ...envVars, ...doc.configmap };
        }
    }

    return Promise.resolve(envVars);
};

export const createSparkScalaJob: (doc: IJobSchema) => Promise<ICapacity> = async (
    doc: IJobSchema
): Promise<ICapacity> => {
    const hrstart: [number, number] = process.hrtime();

    let crdjob: ICrdConfig = crdconfig();

    const id: string = doc._id.toString();
    const org: string = doc.project.org;

    //const getBucket: (org: string) => string = (org: string): string => `${utils.Env.packname}-${utils.Env.K8_SYSTEM}-${org}`;

    /* Assign the py file url to the job */
    crdjob.metadata.name = `j${id}z`;

    await spark.deletePod(crdjob.metadata.name);

    crdjob.spec.sparkConf = {
        'spark.driver.extraClassPath': stocator,
        'spark.task.maxFailures': '1',
        'spark.executor.extraClassPath': stocator,
        //'spark.yarn.maxAppAttempts': 1,  //  put this in the job somewhere
    };

    if (!doc.job.params?.spark?.location || !doc.job.params?.spark?.mainclass) {
        return Promise.reject({
            message: 'No scala configuration provided',
            location: 'spark.scala.job',
            trace: ['@at $spark.scala.job (createSparkScalaJob)'],
        });
    }

    // scala specyfic
    crdjob.spec.type = 'Scala';
    crdjob.spec.mainApplicationFile = doc.job.params.spark.location;
    crdjob.spec.mainClass = doc.job.params.spark.mainclass;

    // environmental variables
    crdjob.spec.driver.envVars = {
        EMAIL: doc.job.email,
        NAME: doc.name,
        ORG: org,
        ID: id,
        TRANSID: doc.job.transid,
        JOBID: doc.job.jobid ? doc.job.jobid : id,
        SPARK__CALLBACK_URL: sparkCredentials.callback_url,
    };

    // extra environmental variables
    if (doc.job?.params?.configmaps) {
        const envVars = await getEnvVars(org, doc.job.params.configmaps);
        crdjob.spec.driver.envVars = { ...crdjob.spec.driver.envVars, ...envVars };
    }

    const credentials: Partial<ICos> = await getCosCredentials(doc);

    crdjob.spec.hadoopConf = {
        'fs.stocator.scheme.list': 'cos',
        'fs.stocator.cos.scheme': 'cos',
        'fs.cos.impl': 'com.ibm.stocator.fs.ObjectStoreFileSystem',
        'fs.stocator.cos.impl': 'com.ibm.stocator.fs.cos.COSAPIClient',
        'fs.cos.mycos.endpoint': credentials.endpoint,
        'fs.cos.connection.ssl.enabled': 'true',
        'fs.cos.mycos.iam.api.key': credentials.apiKeyId,
        'fs.cos.mycos.iam.service.id': credentials.serviceInstanceId,
        'fs.cos.mycos.v2.signer.type': 'false',
    };

    const image: string = doc.job.params?.spark?.image
        ? doc.job.params.spark.image
        : sparkCredentials.scala_image || 'txo-sets-docker-local.artifactory.swg-devops.com/etl-mgr/etl-spark:3.0.0';

    crdjob.spec.image = image;

    crdjob.spec.imagePullSecrets =
        sparkCredentials.imagepullsecrets && sparkCredentials.imagepullsecrets !== ''
            ? sparkCredentials.imagepullsecrets.split(',')
            : ['regsecret'];

    crdjob.spec.driver.podName = id;

    crdjob.spec.executor.javaOptions = encoder;
    crdjob.spec.driver.javaOptions = encoder;

    // adding a volume if there is a volume provisioned and if the flag is on
    if (sparkCredentials.volume && doc.job?.params?.spark?.volume) {
        crdjob = addVolume(crdjob, sparkCredentials.volume);
    }

    /*  add some logic for assigning capacity */
    crdjob = caclCap(doc, crdjob);

    /* for the following 2 lines we may NOT set 0 otherwise spark will throw an error */
    await spark.jobStart(crdjob).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $spark.job (jobStart)');
        err.id = id;
        err.org = org;
        void utils.logError('$spark (createSparkScalaJob): jobStart error', err);

        const pjob: IJobResponse = {
            ...doc.job,
            id,
            count: null,
            jobend: null,
            jobstart: new Date(),
            name: doc.name,
            runtime: null,
            status: EJobStatus.failed,
            org,
            error: err,
        };

        void pubSub.publish(pjob);
    });

    await sparkWatcher.startWatcher(id, true).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $spark.job (startWatcher)');

        void utils.logError('$spark (createSparkScalaJob): startWatcher error', err);
    });

    utils.logInfo(
        `$spark (createSparkScalaJob): started job: ${id}`,
        `ti: ${doc.job.transid}`,
        process.hrtime(hrstart)
    );

    return Promise.resolve({
        driver_cores: crdjob.spec.driver.cores,
        driver_memory: crdjob.spec.driver.memory,
        executor_cores: crdjob.spec.executor.cores,
        executor_memory: crdjob.spec.executor.memory,
        executor_instances: crdjob.spec.executor.instances,
    });
};

/*
     'fs.cos.mycos.access.key': credentials.accessKeyId,
    'fs.cos.mycos.secret.key': credentials.secretAccessKey,

    */
