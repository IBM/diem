import { Credentials } from '@common/cfenv';
import { sparkCredentials } from './spark.base';

export interface ICrdConfig {
    apiVersion: string;
    kind: string;
    metadata: {
        labels: {
            app: string;
            version: string;
        };
        name: string;
        namespace: string;
    };
    spec: {
        imagePullPolicy: string;
        mainApplicationFile: string;
        mainClass?: string;
        mode: string;
        pythonVersion?: string;
        sparkVersion: string;
        hadoopConf?: any;
        deps?: { jars?: string[] };
        driver: {
            envSecretKeyRefs: any;
            envVars: any;
            hostNetwork: boolean;
            memory: string;
            podName: string;
            labels: {
                version: string;
            };
            serviceAccount: string;
            javaOptions?: string;
            volumeMounts?: any[];
            cores: number;
            nodes?: number;
            coreRequest?: string;
        };
        executor: {
            memory: string;
            labels: {
                version: string;
            };
            javaOptions?: string;
            volumeMounts?: any[];
            cores: number;
            instances: number;
            coreRequest?: string;
        };
        restartPolicy: {
            onFailureRetries: number;
            onFailureRetryInterval: number;
            onSubmissionFailureRetries: number;
            onSubmissionFailureRetryInterval: number;
            type: string;
        };
        type: string;
        sparkConf?: any;
        image?: string;
        imagePullSecrets?: string[];
        volumes?: any[];
    };
}

const operator: {
    mode: string;
    driver_cores: string;
    driver_memory: string;
    executor_cores: string;
    executor_instances: string;
    executor_memory: string;
} = Credentials('operator');

export const crdconfig: () => ICrdConfig = (): ICrdConfig => ({
    apiVersion: 'sparkoperator.k8s.io/v1beta2',
    kind: 'SparkApplication',
    metadata: {
        labels: {
            app: 'spark-operator',
            version: 'v1beta2-1.2.0-3.0.0',
        },
        name: 'spark-etl-application',
        namespace: sparkCredentials.namespace,
    },
    spec: {
        imagePullPolicy: 'Always',
        mainApplicationFile: 'dummy',
        mode: operator.mode || 'cluster',
        sparkVersion: '3.1.0',
        driver: {
            cores: 1,
            envSecretKeyRefs: {},
            envVars: {},
            hostNetwork: true,
            memory: operator.driver_memory || '1Gb',
            podName: 'dummy',
            labels: {
                version: '3.1.0',
            },
            serviceAccount: 'spark',
        },
        executor: {
            cores: 1,
            memory: operator.executor_memory || '8Gb',
            labels: {
                version: '3.1.0',
            },
            instances: 1,
        },
        restartPolicy: {
            onFailureRetries: 1,
            onFailureRetryInterval: 10,
            onSubmissionFailureRetries: 5,
            onSubmissionFailureRetryInterval: 20,
            type: 'OnFailure',
        },
        type: 'Python',
    },
});
