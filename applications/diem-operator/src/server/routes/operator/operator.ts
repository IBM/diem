/* eslint-disable @typescript-eslint/indent */
import { setTimeout } from 'timers/promises';
import { serializeError } from 'serialize-error';
import {
    KubernetesObject,
    KubeConfig,
    CoreV1Api,
    makeInformer,
    V1Pod,
    V1ContainerStatus,
    V1ContainerState,
} from '@kubernetes/client-node';
import { utils } from '@config/utils';

export enum ResourceEventType {
    Added = 'ADDED',
    Modified = 'MODIFIED',
    Deleted = 'DELETED',
}

/**
 * An event on a Kubernetes resource.
 */
export interface ResourceEvent {
    meta: ResourceMeta;
    type: ResourceEventType;
    object: KubernetesObject;
}

enum EStatus {
    pending = 'pending',
    running = 'running',
    succeeded = 'succeeded',
    failed = 'failed',
    unknown = 'unknown',
    terminating = 'terminating',
}

/**
 * Some meta information on the resource.
 */
export interface ResourceMeta {
    apiVersion: string;
    application: string;
    kind: string;
    name: string;
    namespace?: string;
    node: string;
    ready?: boolean;
    event: string;
    resourceVersion: string;
    state?: string;
    status: EStatus;
}

const getState = (container_status: V1ContainerStatus | undefined) => {
    if (!container_status) {
        return 'unknown';
    }
    const state: V1ContainerState | undefined = container_status.state;

    if (!state) {
        return 'unknown';
    }

    if (state.running) {
        return 'running';
    } else if (state.terminated) {
        return 'running';
    } else if (state.waiting) {
        return 'running';
    }

    return 'unknown';
};

export const MetaMapper = (kind: string, object: V1Pod, version: string, event: string): ResourceMeta => {
    if (!object.metadata?.name || !object.metadata?.resourceVersion) {
        throw Error(`Malformed event object for '${kind}'`);
    }

    object.apiVersion = version;
    object.kind = kind;

    const container_status: V1ContainerStatus | undefined = object?.status?.containerStatuses
        ? object.status.containerStatuses[0]
        : undefined;

    const labels = object?.metadata.labels;

    let application: string = labels?.app || object.metadata.name;

    if (labels && labels['app.kubernetes.io/instance'] && labels['app.kubernetes.io/name']) {
        application = `${labels['app.kubernetes.io/instance']}-${labels['app.kubernetes.io/name']}`;
    }

    return {
        event,
        application,
        name: object.metadata.name,
        namespace: object.metadata.namespace,
        resourceVersion: object.metadata.resourceVersion,
        apiVersion: object.apiVersion,
        kind: object.kind,
        status: object.metadata.deletionTimestamp
            ? EStatus.terminating
            : object.status?.phase
            ? (object.status.phase as EStatus)
            : EStatus.unknown,
        node: object?.spec?.nodeName || '',
        ready: container_status?.ready || false,
        state: getState(container_status),
    };
};

export const errorToJson = (err: unknown): string => {
    err = serializeError(err);
    if (typeof err === 'string') {
        return err;
    }

    return JSON.stringify(err);
};

export default class Operator {
    public kc: KubeConfig;
    public k8sApi: CoreV1Api;
    public ns: string;

    public resourcePathBuilders: Record<string, (meta: ResourceMeta) => string> = {};

    /**
     * Constructs an this.
     */
    public constructor() {
        this.kc = new KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(CoreV1Api);
        this.ns = process.env.NAMESPACE || 'default';
    }

    /**
     * Get uri to the API for your custom resource.
     *
     * @param group The group of the custom resource
     * @param version The version of the custom resource
     * @param kind The kind name of the custom resource
     * @param namespace Optional namespace to include in the uri
     */
    public getCustomResourceApiUri(group: string, version: string, kind: string, namespace?: string): string {
        let path = group ? `/apis/${group}/${version}/` : `/api/${version}/`;
        if (namespace) {
            path += `namespaces/${namespace}/`;
        }
        path += kind;

        utils.logInfo(`$operator (getCustomResourceApiUri): ${this.k8sApi.basePath + path}`);

        return this.k8sApi.basePath + path;
    }

    public Informer = async (group: string, version: string, kind: string): Promise<void> => {
        const apiVersion = group ? `${group}/${version}` : `${version}`;
        const id = `${kind}.${apiVersion}`;

        this.resourcePathBuilders[id] = (meta: ResourceMeta): string =>
            this.getCustomResourceApiUri(group, version, kind, meta.namespace);

        let uri = group ? `/apis/${group}/${version}/` : `/api/${version}/`;

        uri = `${uri}namespaces/${this.ns}/${kind}`;

        utils.logInfo(`$operator (informer): uri: ${uri}`);

        const listFn = async () => this.k8sApi.listNamespacedPod(this.ns);

        const informer = makeInformer(this.kc, uri, listFn);

        informer.on('add', (obj: V1Pod) => {
            const m = MetaMapper(kind, obj, version, 'add');
            utils.logInfo(
                `$operator (event): app: ${m.application} - pod: ${m.name} - state: ${m.state} - event: ${m.event} - status: ${m.status} - ready: ${m.ready}`
            );
        });
        informer.on('update', (obj: V1Pod) => {
            const m = MetaMapper(kind, obj, version, 'update');
            utils.logInfo(
                `$operator (event): app: ${m.application} - pod: ${m.name} - state: ${m.state} - event: ${m.event} - status: ${m.status} - ready: ${m.ready}`
            );
        });
        informer.on('delete', (obj: V1Pod) => {
            //console.dir(obj, { depth: null });
            const m = MetaMapper(kind, obj, version, 'delete');
            utils.logCyan(
                `$operator (event): app: ${m.application} - pod: ${m.name} - state: ${m.state} - event: ${m.event} - status: ${m.status} - ready: ${m.ready}`
            );
        });
        informer.on('error', async (err: V1Pod) => {
            console.info(`$operator (Informer): restarting informer ${id} - reason: ${errorToJson(err)}`);
            await setTimeout(5000);
            void informer.start();
        });

        console.info(`$operator (Informer): starting informer ${id}...`);

        await informer.start();
    };
}
