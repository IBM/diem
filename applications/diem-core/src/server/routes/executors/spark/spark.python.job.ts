import { utils } from '@common/utils';
import { EJobStatus, IJobResponse, IJobSchema } from '@models';
import { pubSub } from '@config/pubsub';
import { addTrace } from '@functions';
import { ICapacity } from '@interfaces';
import { crdconfig, ICrdConfig } from '../../spark-operator/base.crd';
import { spark, sparkCredentials } from '../../spark-operator/spark.base';
import { caclCap } from '../../spark-operator/spark.capacity';
import { sparkWatcher } from '../../spark-operator/spark.watcher';
import { addVolume, getCosCredentials, ICos } from './spark.common';

const stocator = '/opt/cos/stocator-1.1.3.jar';
const encoder = '-Ddb2.jcc.charsetDecoderEncoder=3';

export const createSparkPythonJob: (doc: IJobSchema) => Promise<ICapacity> = async (
    doc: IJobSchema
): Promise<ICapacity> => {
    const hrstart: [number, number] = process.hrtime();

    let crdjob: ICrdConfig = crdconfig();

    const id: string = doc._id.toString();
    const org: string = doc.project.org;

    /* Assign the py file url to the job */
    crdjob.metadata.name = `j${id}z`;

    await spark.deletePod(crdjob.metadata.name);

    crdjob.spec.sparkConf = {
        'spark.sql.execution.arrow.pyspark.enabled': 'true',
        'spark.pyspark.python': '/opt/app-root/bin/python',
        'spark.sql.execution.arrow.pyspark.fallback.enabled': 'true',
        'spark.sql.adaptive.enabled': doc.job.params?.spark?.adaptive ? 'true' : 'false',
        'spark.driver.extraClassPath': stocator,
        'spark.task.maxFailures': '1',
        'spark.executor.extraClassPath': stocator,
        'spark.kubernetes.local.dirs.tmpfs': doc.job.params?.spark?.tmpfs ? 'true' : 'false',
        //'spark.yarn.maxAppAttempts': 1,  //  put this in the job somewhere
    };

    // pyspark specyfic
    crdjob.spec.mainApplicationFile = `${sparkCredentials.file_url}/${id}.py`;
    crdjob.spec.pythonVersion = '3';

    // environmental variables
    crdjob.spec.driver.envVars = {
        EMAIL: doc.job.email,
        NAME: doc.name,
        ORG: org,
        ID: id,
        TRANSID: doc.job.transid,
        JOBID: doc.job.jobid ? doc.job.jobid : id,
        SPARK__CALLBACK_URL: sparkCredentials.callback_url,
        APPNAME: process.env.NAME,
        K8_SYSTEM: process.env.K8_SYSTEM,
        KUBERNETES_TLS_VERSIONS: 'TLSv1.2,TLSv1.3',
    };

    if (doc.job.params?.files) {
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
    }

    let image = 'quay.io/diem/pyspark:3.2.0_rhel';

    if (doc.job.params?.spark?.image) {
        image = doc.job.params.spark.image;
    } else if (sparkCredentials.image) {
        image = sparkCredentials.image;
    }

    crdjob.spec.image = image;

    crdjob.spec.imagePullSecrets =
        sparkCredentials.imagepullsecrets && sparkCredentials.imagepullsecrets !== ''
            ? sparkCredentials.imagepullsecrets.split(',')
            : ['regsecret'];

    crdjob.spec.driver.podName = id;

    crdjob.spec.executor.javaOptions = encoder;
    crdjob.spec.driver.javaOptions = encoder;

    // adding a volume if there is a volume provisioned and if the flag is on
    if (sparkCredentials.volume && doc.job.params?.spark?.volume) {
        crdjob = addVolume(crdjob, sparkCredentials.volume, id);
    }

    /*  add some logic for assigning capacity */
    crdjob = caclCap(doc, crdjob);

    /* for the following 2 lines we may NOT set 0 otherwise spark will throw an error */
    await spark.jobStart(crdjob).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $spark.job (jobStart)');
        err.id = id;
        err.org = org;
        void utils.emit('error', err);

        const pjob: IJobResponse = {
            ...doc.job,
            id,
            name: doc.name,
            count: null,
            jobend: null,
            jobstart: new Date(),
            runtime: null,
            status: EJobStatus.failed,
            org,
            error: err,
        };

        void pubSub.publish(pjob);
    });

    await sparkWatcher.startWatcher(id, false).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $spark.job (startWatcher)');

        void utils.emit('error', err);
    });

    utils.logInfo(
        `$spark (createSparkPythonJob): started job: ${id}`,
        `ti: ${doc.job.transid}`,
        process.hrtime(hrstart)
    );

    return Promise.resolve({
        driver_cores: crdjob.spec.driver.cores,
        driver_memory: crdjob.spec.driver.memory,
        executor_cores: crdjob.spec.executor.cores,
        executor_memory: crdjob.spec.executor.memory,
        executor_instances: crdjob.spec.executor.instances || 1,
    });
};

export const publishSparkJob: (doc: IJobSchema) => Promise<void> = async (doc: IJobSchema): Promise<void> => {
    void pubSub.publish({
        ...doc.job,
        id: doc._id.toString(),
        name: doc.name,
        count: null,
        jobend: null,
        jobstart: new Date(),
        runtime: null,
        status: EJobStatus.submitted,
        org: doc.project.org,
    });
};

/*

        just for information , openshift applies it own security

        crdjob.spec.driver.securityContext = {
            fsGroup: 0,
            privileged: true,
            runAsUser: 0, // spark needs to run as root , natbe to be fixed
        };

        crdjob.spec.executor.securityContext = {
            fsGroup: 0,
            privileged: true,
            runAsUser: 0, // spark needs to run as root , natbe to be fixed
        };
        */
