/*

This model is not used anymore. it's purpose was to watch in continous mode pods


*/
import { utils } from '@common/utils';
import { Credentials } from '@common/cfenv';
import * as Api from 'kubernetes-client';
import { pubSub } from '../../config/pubsub';
import { EJobStatus, ExecutorTypes } from '../models/models';

//' import { jobLogger } from '../job/job.logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSONStream: any = require('json-stream');

interface IApis extends Api.Apis {
    [key: string]: any;
}

enum ETypes {
    'MODIFIED',
    'ADDED',
    'DELETED',
}

enum EStates {
    'FAILING',
    'SUBMISSION_FAILED',
    'DELETED',
    'SUBMITTED',
}

interface EApplicationState {
    state: keyof typeof EStates;
    errorMessage?: string;
}

interface ISparkObject {
    type: keyof typeof ETypes;
    object: {
        metadata: { name: string };
        status: {
            applicationState: EApplicationState;
            terminationTime: Date;
            sparkApplicationId: string;
        };
        spec: {
            driver: {
                envVars: any;
            };
        };
    };
}

interface IObj {
    count: number | null;
    email: string;
    executor: keyof typeof ExecutorTypes;
    id: string;
    jobend: Date | null;
    jobid: string;
    jobstart: Date;
    name: string;
    runby: string;
    runtime: number | null;
    transid: string;
    org: string;
}

export const sparkCredentials: {
    namespace: string;
    image: string;
    file_url: string;
    callback_url: string;
} = Credentials('spark');

class SparkLib {
    public appsApi: any;
    public crd: any;

    private client: Api.ApiRoot;
    private apis: IApis;

    public constructor() {
        const apiClient: Api.ApiClient = Api.Client1_13;

        this.client = new apiClient({ version: '1.13' });

        this.crd = {
            apiVersion: 'apiextensions.k8s.io/v1beta2',
            kind: 'CustomResourceDefinition',
            metadata: {
                name: 'sparkapplications.sparkoperator.k8s.io',
            },
            spec: {
                group: 'sparkoperator.k8s.io',
                names: {
                    kind: 'SparkApplication',
                    listKind: 'SparkApplicationList',
                    plural: 'sparkapplications',
                    shortNames: ['sparkapp'],
                    singular: 'sparkapplication',
                },
                scope: 'Namespaced',
                version: 'v1beta2',
            },
        };

        this.client.addCustomResourceDefinition(this.crd);

        this.apis = this.client.apis;

        this.appsApi = this.apis[this.crd.spec.group].v1beta2.namespaces(sparkCredentials.namespace).sparkapplications;
    }

    public getJobLog = async (id: string) => {
        try {
            const log: any = await this.client.api.v1.namespaces(sparkCredentials.namespace).pods(id).log.get();

            return log.body;
        } catch (err) {
            return undefined;
        }
    };

    public startWorker = async () => {
        await this.watcher();

        utils.logInfo('$spark.worker (watcher): starting spark watcher');
    };

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private watcher = async () => {
        if (!this.apis[this.crd.spec.group]) {
            utils.logInfo('$spark.worker (watcher): no sparkapplications detected');

            return;
        }

        // eslint-disable-next-line max-len
        utils.logInfo(
            // eslint-disable-next-line max-len
            `$spark.worker (watcher): starting to watch sparkapplications - group: ${this.crd.spec.group} namespace: ${sparkCredentials.namespace}`
        );

        const appsApi: Api.ApiV1WatchEvents = this.apis[this.crd.spec.group].v1beta2.watch.namespaces(
            sparkCredentials.namespace
        ).sparkapplications;

        const stream: any = appsApi.getStream({ qs: { follow: true } });

        const jsonStream: any = new JSONStream();
        stream.pipe(jsonStream);

        jsonStream.on('data', async (data: ISparkObject) => {
            const obj: IObj = {
                name: 'No Name Found',
                email: 'anonymous',
                count: null,
                runtime: null,
                executor: ExecutorTypes.pyspark,
                id: '',
                jobid: '',
                jobstart: new Date(),
                jobend: null,
                runby: '',
                transid: '',
                org: '',
            };

            if (Object.values(ETypes).includes(data.type)) {
                const name: string = data.object.metadata.name;
                obj.id = name.substring(1, name.length - 1);

                if (data.object.spec && data.object.spec.driver && data.object.spec.driver.envVars) {
                    obj.email = data.object.spec.driver.envVars.EMAIL;
                    obj.jobid = data.object.spec.driver.envVars.JOBID;
                    obj.name = data.object.spec.driver.envVars.NAME;
                    obj.transid = data.object.spec.driver.envVars.TRANSID;
                }

                if (data.object.status) {
                    const applicationState: EApplicationState = data.object.status.applicationState;

                    if (data.object.status.terminationTime) {
                        obj.jobend = data.object.status.terminationTime;
                    }

                    utils.logInfo(
                        `$spark.worker (watcher): incoming stream - id: ${obj.id} - type: ${data.type} - status: ${applicationState.state}`
                    );

                    if (data.type !== 'DELETED') {
                        /*  console.info(data.object.status);
                            {
                                applicationState: { state: 'RUNNING' },
                                driverInfo: {
                                    podName: '5f493623a483d9f0adc30a14',
                                    webUIAddress: '10.99.225.102:4040',
                                    webUIPort: 4040,
                                    webUIServiceName: 'j5f493623a483d9f0adc30a14z-ui-svc'
                                },
                                executionAttempts: 1,
                                executorState: { '5f493623a483d9f0adc30a14-b71df9743c2e36cd-exec-1': 'PENDING' },
                                lastSubmissionAttemptTime: '2020-08-29T21:44:48Z',
                                sparkApplicationId: 'spark-b5364322e4d748559b2d40834fb38092',
                                submissionAttempts: 1,
                                submissionID: '613c3ffe-f96d-48b8-8d2c-db28490dedd9',
                                terminationTime: null
                            }

                        */

                        if (applicationState.state === 'SUBMITTED' && data.object.status.sparkApplicationId) {
                            /*  this code is not needed, handled by etl-mgr , maybe usefull one day
                            const log: any = await this.getJobLog(obj.id);

                            pubSub.publish({
                                ...obj,
                                error: log,
                                status: 'Submitted',
                            });
                            */
                        }

                        if (['FAILING', 'SUBMISSION_FAILED'].includes(applicationState.state)) {
                            utils.logInfo(`$spark.worker (spark.base): failing - collecting log - id: ${obj.id}`);

                            const log: any = await this.getJobLog(obj.id);

                            await pubSub.publish({
                                ...obj,
                                error: log,
                                status: EJobStatus.failed,
                            });
                        }
                    }
                } else {
                    utils.logInfo(
                        `$spark.worker (watcher): incoming stream - id: ${obj.id} - type: ${data.type} - status: n/a`
                    );
                }
            } else {
                utils.logInfo(`$spark.worker (watcher): other incoming stream - type: ${data.type}`);
            }
        });

        jsonStream.on('end', async () => {
            utils.logInfo('$spark.worker (watcher): restarting watch sparkapplications');

            await this.watcher();
        });
    };
}

export const spark: SparkLib = new SparkLib();
