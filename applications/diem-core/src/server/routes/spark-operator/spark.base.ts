import * as Api from 'kubernetes-client';
import { Credentials } from '@common/cfenv';
import { utils } from '@common/utils';
import { addTrace } from '@functions';
import { sparkWatcher } from './spark.watcher';

interface IApis extends Api.Apis {
    [key: string]: any;
}

export const sparkCredentials: {
    namespace: string;
    image: string;
    scala_image: string;
    file_url: string;
    callback_url: string;
    imagepullsecrets?: string;
    volume?: string;
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
            apiVersion: 'sparkoperator.k8s.io/v1beta2',
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

    public getJobs = async () => {
        const jobs: any = await this.appsApi.get();

        return jobs.body.items.map((row: any) => ({
            name: row.metadata.name,
            status:
                row.status && row.status.applicationState && row.status.applicationState.state
                    ? row.status.applicationState.state
                    : 'Unspecified',
        }));
    };

    public getJob = async (id: string) => this.appsApi(id).get();

    public getJobLog = async (id: string) => {
        try {
            const log: any = await this.client.api.v1.namespaces(sparkCredentials.namespace).pods(id).log.get();

            return log.body;
        } catch (err) {
            return undefined;
        }
    };

    public jobStart = async (crdjob: any) => {
        try {
            utils.logInfo(`$spark.base (jobStart): starting spark job - pod: ${crdjob.metadata.name}`);
            await this.appsApi.post({ body: crdjob });

            return Promise.resolve();
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.base (jobStart)');

            // console.info(err);

            return Promise.reject(err);
        }
    };

    public deletePod: (id: string) => Promise<boolean> = async (id: string): Promise<boolean> => {
        const jobs: any = await this.getJobs();

        const name: string = `j${id}z`;

        const t: any | undefined = jobs.find((e: any) => e.name === name);

        if (t) {
            await this.appsApi(name).delete();
            utils.logInfo(`$spark.base (deletePod): pod deleted - cleaning stream - id: ${id} - pod: ${name}`);
            await sparkWatcher.checkStream(id);
        } else {
            utils.logInfo(`$spark.base (deletePod): no running pod with name: ${name}`);

            const p: any | undefined = jobs.find((e: any) => e.name === id);

            if (p) {
                await this.appsApi(id).delete();
                utils.logInfo(`$spark.base (deletePod): pod deleted - cleaning stream - id: ${id} - pod: ${name}`);
                await sparkWatcher.checkStream(id);
            } else {
                utils.logInfo(`$spark.base (deletePod): no running pod with id: ${id}`);
            }
        }

        return Promise.resolve(true);
    };
}

export const spark: SparkLib = new SparkLib();
