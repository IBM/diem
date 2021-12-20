/* eslint-disable @typescript-eslint/indent */
import { setTimeout } from 'timers/promises';
import * as FS from 'fs';
import * as https from 'https';
import * as YAML from 'js-yaml';
import Axios, { AxiosRequestConfig, Method as HttpMethod } from 'axios';
import { serializeError } from 'serialize-error';
import {
    KubernetesObject,
    V1CustomResourceDefinitionVersion,
    KubeConfig,
    CoreV1Api,
    V1CustomResourceDefinition,
    ApiextensionsV1Api,
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

/**
 * Some meta information on the resource.
 */
export interface ResourceMeta {
    apiVersion: string;
    kind: string;
    name: string;
    namespace?: string;
    node: string;
    ready?: boolean;
    reason: string;
    resourceVersion: string;
    state?: string;
    status: string;
}

const getState = (container_status: V1ContainerStatus | undefined) => {
    if (!container_status) {
        return 'unknown';
    }
    const state: V1ContainerState | undefined = container_status.state;

    if (!state) {
        return 'unknown';
    }

    if (state.running || state.terminated || state.waiting) {
        return 'running';
    }

    return 'unknown';
};

export const MetaMapper = (kind: string, object: V1Pod, version: string, reason: string): ResourceMeta => {
    if (!object.metadata?.name || !object.metadata?.resourceVersion) {
        throw Error(`Malformed event object for '${kind}'`);
    }

    object.apiVersion = version;
    object.kind = kind;

    const container_status: V1ContainerStatus | undefined = object?.status?.containerStatuses
        ? object.status.containerStatuses[0]
        : undefined;

    return {
        reason,
        name: object.metadata.name,
        namespace: object.metadata.namespace,
        resourceVersion: object.metadata.resourceVersion,
        apiVersion: object.apiVersion,
        kind: object.kind,
        status: object.metadata.deletionTimestamp ? 'Terminating' : object.status?.phase ? object.status.phase : '',
        node: object?.spec?.nodeName || '',
        ready: container_status?.ready,
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
            console.info(MetaMapper(kind, obj, version, 'Added'));
        });
        informer.on('update', (obj: V1Pod) => {
            console.info(MetaMapper(kind, obj, version, 'Updated'));
        });
        informer.on('delete', (obj: V1Pod) => {
            console.info(MetaMapper(kind, obj, version, 'Deleted'));
        });
        informer.on('error', async (err: V1Pod) => {
            console.info(`$operator (Informer): restarting informer ${id} - reason: ${errorToJson(err)}`);
            await setTimeout(5000);
            void informer.start();
        });

        console.info(`$operator (Informer): starting informer ${id}...`);

        await informer.start();
    };

    /**
     * Register a custom resource defintion.
     *
     * @param crdFile The path to the custom resource definition's YAML file
     */
    public async registerCustomResourceDefinition(crdFile: string): Promise<{
        group: string;
        versions: V1CustomResourceDefinitionVersion[] | undefined;
        kind: string;
    }> {
        const crd: V1CustomResourceDefinition = YAML.load(FS.readFileSync(crdFile, 'utf8')) as any;

        if (typeof crd !== 'object') {
            return Promise.reject();
        }
        try {
            const apiVersion = crd.apiVersion;
            if (!apiVersion?.startsWith('apiextensions.k8s.io/')) {
                throw new Error("Invalid CRD yaml (expected 'apiextensions.k8s.io')");
            }

            await this.kc
                .makeApiClient(ApiextensionsV1Api)
                .createCustomResourceDefinition(crd as V1CustomResourceDefinition);

            return {
                group: crd.spec.group,
                versions: crd.spec.versions,
                kind: crd.spec.names.kind,
            };
        } catch (err) {
            // API returns a 409 Conflict if CRD already exists.
            if (err.response.statusCode !== 409) {
                throw err;
            }
        }

        return Promise.reject();
    }

    /**
     * Set the status subresource of a custom resource (if it has one defined).
     *
     * @param meta The resource to update
     * @param status The status body to set
     */
    public async setResourceStatus(meta: ResourceMeta, status: unknown): Promise<ResourceMeta | null> {
        return this.resourceStatusRequest('PUT', meta, status);
    }

    /**
     * Patch the status subresource of a custom resource (if it has one defined).
     *
     * @param meta The resource to update
     * @param status The status body to set in JSON Merge Patch format (https://tools.ietf.org/html/rfc7386)
     */
    public async patchResourceStatus(meta: ResourceMeta, status: unknown): Promise<ResourceMeta | null> {
        return this.resourceStatusRequest('PATCH', meta, status);
    }

    /**
     * Handle deletion of resource using a unique finalizer. Call this when you receive an added or modified event.
     *
     * If the resource doesn't have the finalizer set yet, it will be added. If the finalizer is set and the resource
     * is marked for deletion by Kubernetes your 'deleteAction' action will be called and the finalizer will be removed.
     *
     * @param event The added or modified event.
     * @param finalizer Your unique finalizer string
     * @param deleteAction An async action that will be called before your resource is deleted.
     * @returns True if no further action is needed, false if you still need to process the added or modified event yourself.
     */
    public async handleResourceFinalizer(
        event: ResourceEvent,
        finalizer: string,
        deleteAction: (event: ResourceEvent) => Promise<void>
    ): Promise<boolean> {
        const metadata = event.object.metadata;
        if (!metadata || (event.type !== ResourceEventType.Added && event.type !== ResourceEventType.Modified)) {
            return false;
        }
        if (!metadata.deletionTimestamp && (!metadata.finalizers || !metadata.finalizers.includes(finalizer))) {
            // Make sure our finalizer is added when the resource is first created.
            const finalizers = metadata.finalizers ?? [];
            finalizers.push(finalizer);
            await this.setResourceFinalizers(event.meta, finalizers);

            return true;
        } else if (metadata.deletionTimestamp) {
            if (metadata.finalizers && metadata.finalizers.includes(finalizer)) {
                // Resource is marked for deletion with our finalizer still set. So run the delete action
                // and clear the finalizer, so the resource will actually be deleted by Kubernetes.
                await deleteAction(event);
                const finalizers = metadata.finalizers.filter((f) => f !== finalizer);
                await this.setResourceFinalizers(event.meta, finalizers);
            }

            // Resource is marked for deletion, so don't process it further.
            return true;
        }

        return false;
    }

    /**
     * Set (or clear) the finalizers of a resource.
     *
     * @param meta The resource to update
     * @param finalizers The array of finalizers for this resource
     */
    private async setResourceFinalizers(meta: ResourceMeta, finalizers: string[]): Promise<void> {
        const request: AxiosRequestConfig = {
            method: 'PATCH',
            url: `${this.resourcePathBuilders[meta.kind](meta)}/${meta.name}`,
            data: {
                metadata: {
                    finalizers,
                },
            },
            headers: {
                'Content-Type': 'application/merge-patch+json',
            },
        };

        await this.applyAxiosKubeConfigAuth(request);

        await Axios.request(request).catch((error) => {
            if (error) {
                console.error(errorToJson(error));
            }
        });
    }

    /**
     * Apply authentication to an axios request config.
     *
     * @param request the axios request config
     */
    private async applyAxiosKubeConfigAuth(request: AxiosRequestConfig): Promise<void> {
        const opts: https.RequestOptions = {};
        await this.kc.applytoHTTPSOptions(opts);
        if (opts.headers?.Authorization && typeof opts.headers.Authorization === 'string') {
            request.headers = request.headers ?? {};
            request.headers.Authorization = opts.headers.Authorization;
        }
        if (opts.auth) {
            const userPassword = opts.auth.split(':');
            request.auth = {
                username: userPassword[0],
                password: userPassword[1],
            };
        }
        if (opts.ca || opts.cert || opts.key) {
            request.httpsAgent = new https.Agent({
                ca: opts.ca,
                cert: opts.cert,
                key: opts.key,
            });
        }
    }

    private async resourceStatusRequest(
        method: HttpMethod,
        meta: ResourceMeta,
        status: unknown
    ): Promise<ResourceMeta | null> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            apiVersion: meta.apiVersion,
            kind: meta.kind,
            metadata: {
                name: meta.name,
                resourceVersion: meta.resourceVersion,
            },
            status,
        };
        if (meta.namespace) {
            body.metadata.namespace = meta.namespace;
        }
        const request: AxiosRequestConfig = {
            method,
            url: `${this.resourcePathBuilders[meta.kind](meta)}/${meta.name}/status`,
            data: body,
        };
        if (method === 'patch' || method === 'PATCH') {
            request.headers = {
                'Content-Type': 'application/merge-patch+json',
            };
        }
        await this.applyAxiosKubeConfigAuth(request);
        try {
            const response = await Axios.request<KubernetesObject>(request);

            return response ? MetaMapper(meta.kind, response.data, meta.apiVersion, meta.kind) : null;
        } catch (err) {
            console.error(errorToJson(err));

            return null;
        }
    }
}
