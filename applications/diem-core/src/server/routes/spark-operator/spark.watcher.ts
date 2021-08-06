/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import { utils } from '@common/utils';
import { Credentials } from '@common/cfenv';
import * as Api from 'kubernetes-client';
import { IError } from '@interfaces';
import { pubSub } from '@config/pubsub';
import { ExecutorTypes, EJobStatus } from '@models';
import { addTrace } from '@functions';

const JSONStream: any = require('json-stream');

interface IApis extends Api.Apis {
    [key: string]: any;
}

enum ETypes {
    added = 'ADDED',
    deleted = 'DELETED',
    modified = 'MODIFIED',
}

enum EStates {
    deleted = 'DELETED',
    failing = 'FAILING',
    failed = 'FAILED',
    running = 'RUNNING',
    submission_failed = 'SUBMISSION_FAILED',
    submitted = 'SUBMITTED',
    succeeding = 'SUCCEEDING',
    completed = 'COMPLETED',
}

interface EApplicationState {
    state: EStates;
    errorMessage?: string;
}

interface ISparkObject {
    type: ETypes;
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
} = Credentials('spark');

class SparkLib {
    public appsApi: any;
    public crd: any;

    private client: Api.ApiRoot;
    private apis: IApis;

    private streams: { [index: string]: { stream: any; log: boolean; jsonstream: any; status: string } } = {};

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

    public abort: (id: string, from: string) => Promise<any> = async (id: string, from: string): Promise<any> => {
        /* if it's from this watcher , the no timeout is needed,
         * if it's been called from elsewhere give it 3 seconds as watcher might still be in progress
         */
        const time: number = from === 'watcher' ? 0 : 3000;

        setTimeout(async () => {
            if (this.streams[id] && this.streams[id].stream) {
                utils.logInfo(
                    `$spark.watcher (checkStream): going to abort any open stream - id: ${id} - from: ${from}`
                );
                await this.streams[id].stream.destroy();
                await this.streams[id].stream.abort();

                delete this.streams[id];

                return Promise.resolve();
            } else {
                utils.logInfo(`$spark.watcher (checkStream): no open stream found - id: ${id} - from: ${from}`);

                return Promise.resolve();
            }
        }, time);
    };

    public checkStream: (id: string) => Promise<void> = async (id: string): Promise<void> => {
        await this.abort(id, 'checkstream');

        return Promise.resolve();
    };

    public getJobLog: (id: string) => Promise<any> = async (id: string): Promise<any> => {
        try {
            const log: any = await this.client.api.v1.namespaces(sparkCredentials.namespace)?.pods(id)?.log.get();

            // some code to prevent large logs
            let body: string;

            if (log && log.body && log.body.length && log.body.length > 10000) {
                body = `${log.body.slice(0, 3000)}\n\n....\n\n${log.body.slice(-7000)}`;
            } else {
                body = log.body;
            }

            return Promise.resolve(body);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.watcher (getJobLog)');
            err.id = id;

            return Promise.reject(err);
        }
    };

    public startWatcher: (id: string, managed?: boolean) => Promise<void> = async (
        id: string,
        managed?: boolean
    ): Promise<void> => {
        if (!this.apis[this.crd.spec.group]) {
            utils.logInfo(`$spark.watcher (watcher): no sparkapplications detected - id: ${id}`);

            return Promise.resolve();
        }

        const appsApi: Api.ApiV1WatchEvents = this.apis[this.crd.spec.group].v1beta2.watch.namespaces(
            sparkCredentials.namespace
        ).sparkapplications;

        this.streams[id] = {
            stream: appsApi.getStream({ qs: { follow: true } }),
            log: false,
            jsonstream: new JSONStream(),
            status: '',
        };

        utils.logInfo(
            `$spark.watcher (watcher): started watching - id: ${id} - group: ${this.crd.spec.group} - streams: ${
                Object.keys(this.streams).length
            }`
        );

        this.streams[id].stream.pipe(this.streams[id].jsonstream);

        this.streams[id].stream.on('error', async (err: IError) => {
            if (this.streams[id]) {
                utils.logInfo(`$spark.watcher (watcher): restart errored stream - id: ${id}`);
                await this.startWatcher(id);
            } else {
                if (err.message === 'aborted') {
                    utils.logInfo(`$spark.watcher (watcher): stream aborted - id: ${id}`);
                } else {
                    await utils.logError(`$spark.watcher (watcher): other stream error - ${id}`, err);
                }
            }
        });

        this.streams[id].jsonstream.on('data', async (data: ISparkObject) => {
            const obj: IObj = {
                name: 'No Name Found',
                email: 'anonymous',
                count: null,
                runtime: null,
                executor: ExecutorTypes.pyspark,
                id: '',
                jobid: '',
                jobend: null,
                runby: '',
                transid: '',
                org: '',
            };

            // if there's no type then return
            if (
                !data.object ||
                (data.object && !data.object.metadata) ||
                (data.object.metadata && !data.object.metadata.name)
            ) {
                // we return but keep streaming
                return;
            }

            // in case you want to debug the data
            //console.dir(data, { depth: null });

            const name: string = data.object.metadata.name;
            obj.id = name.substring(1, name.length - 1);

            // it's not for us
            if (obj.id !== id) {
                // await this.abort(id, `watcher - wrong id: ${id} - name: ${name}`);
                utils.logInfo(`$spark.watcher (watcher): skipping - id: ${id} - spark application name: ${name}`);

                return;
            }

            // if there's no type then return and wait for later
            if (!Object.values(ETypes).includes(data.type)) {
                return;
            }

            // no status , not interesting then
            if (!data.object?.status) {
                utils.logInfo(`$spark.watcher (watcher): Pod status update - id: ${obj.id} - type: ${data.type}`);

                return;
            }

            // here we are at the real stuff

            if (data.object.spec && data.object.spec.driver && data.object.spec.driver.envVars) {
                obj.email = data.object.spec.driver.envVars.EMAIL;
                obj.jobid = data.object.spec.driver.envVars.JOBID || obj.id;
                obj.name = data.object.spec.driver.envVars.NAME;
                obj.transid = data.object.spec.driver.envVars.TRANSID;
            }

            const applicationState: EApplicationState = data.object.status.applicationState;

            if (data.object?.status?.terminationTime) {
                obj.jobend = data.object.status.terminationTime;
            }

            // we now have everything that is not in status deleted or failing
            // a simple console info about an event for this pod, only if the stream status changes
            if (
                [ETypes.modified, ETypes.added].includes(data.type) &&
                ![EStates.deleted, EStates.failing, EStates.submission_failed].includes(applicationState.state) &&
                this.streams[id]?.status !== applicationState.state
            ) {
                utils.logInfo(
                    `$spark.watcher (watcher): event - id: ${obj.id} - type: ${data.type} - status: ${applicationState.state}`
                );
            }

            if (managed && this.streams[id] && this.streams[id]?.status !== applicationState.state) {
                this.streams[id].status = applicationState.state;
                if (applicationState.state === EStates.running) {
                    utils.logInfo(`$spark.watcher (managed watcher): set running - id: ${id}`);
                    void pubSub.publish({
                        ...obj,
                        status: EJobStatus.running,
                    });
                } else if (applicationState.state === EStates.completed) {
                    utils.logInfo(
                        `$spark.watcher (managed watcher): collecting log and publishing Completed - id: ${id}`
                    );

                    const out: string = await this.getJobLog(obj.id).catch(async () => {
                        utils.logInfo(`$spark.watcher (managed watcher): no log found - passing to abort - id: ${id}`);

                        await this.abort(id, 'watcher - getJobLog');
                    });

                    void pubSub.publish({
                        ...obj,
                        out,
                        status: EJobStatus.completed,
                    });
                }
            }

            // set the stream status
            if (this.streams[id] && this.streams[id]?.status !== applicationState.state) {
                this.streams[id].status = applicationState.state;
            }

            if (
                [EStates.failed, EStates.failing, EStates.submission_failed].includes(applicationState.state) &&
                !this.streams[id]?.log
            ) {
                utils.logInfo(
                    `$spark.watcher (watcher): collecting log and publishing failed - id: ${obj.id} - type: ${data.type} - status: ${applicationState.state}`
                );

                let log: any = 'Unspecified error';

                log = await this.getJobLog(obj.id).catch(async () => {
                    utils.logInfo(`$spark.watcher (not managed watcher): no log found - passing to abort - id: ${id}`);

                    await this.abort(id, 'watcher - getJobLog');
                });

                if (this.streams[id]) {
                    this.streams[id].log = true;
                }

                void pubSub.publish({
                    ...obj,
                    error: log,
                    status: EJobStatus.failed,
                });
            }

            if (data.type === ETypes.deleted) {
                utils.logInfo(
                    `$spark.watcher (watcher): passing to abort - id: ${obj.id} - type: ${data.type} - status: ${applicationState.state}`
                );

                await this.abort(id, 'watcher - deleted');
            }
        });

        this.streams[id].jsonstream.on('end', async () => {
            if (this.streams[id]) {
                utils.logInfo(`$spark.watcher (watcher): restart watching id: ${id}`);
                await this.startWatcher(id);
            }
        });

        this.streams[id].jsonstream.on('aborted', async () => {
            if (this.streams[id]) {
                utils.logInfo(`$spark.watcher (watcher): restart aborted jsonstream stream for id: ${id}`);
                await this.startWatcher(id);
            }
        });

        return Promise.resolve();
    };
}

export const sparkWatcher: SparkLib = new SparkLib();
