/* eslint-disable @typescript-eslint/indent */
import * as FS from 'fs';
import * as https from 'https';
import * as YAML from 'js-yaml';
import Axios, { AxiosRequestConfig, Method as HttpMethod } from 'axios';
import { serializeError } from 'serialize-error';
import {
    KubernetesObject,
    V1beta1CustomResourceDefinitionVersion,
    V1CustomResourceDefinitionVersion,
    Watch,
    KubeConfig,
    CoreV1Api,
    V1beta1CustomResourceDefinition,
    V1CustomResourceDefinition,
    ApiextensionsV1Api,
    ApiextensionsV1beta1Api,
} from '@kubernetes/client-node';

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
    id: string;
    kind: string;
    name: string;
    namespace?: string;
    node: string;
    reason: string;
    resourceVersion: string;
    status: string;
    state: string;
    ready: boolean;
}

export const MetaMapper = (id: string, object: any, reason: any): ResourceMeta => {
    if (!object.metadata?.name || !object.metadata?.resourceVersion || !object.apiVersion || !object.kind) {
        throw Error(`Malformed event object for '${id}'`);
    }

    return {
        id,
        name: object.metadata.name,
        namespace: object.metadata.namespace,
        resourceVersion: object.metadata.resourceVersion,
        apiVersion: object.apiVersion,
        kind: object.kind,
        status: object.metadata.deletionTimestamp ? 'Terminating' : object.status.phase,
        node: object.spec.nodeName,
        reason,
        state: object.status.containerStatuses[0]?.state,
        ready: object.status.containerStatuses[0]?.ready,
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

    public resourcePathBuilders: Record<string, (meta: ResourceMeta) => string> = {};
    private watchRequests: Record<string, { abort(): void }> = {};

    /**
     * Constructs an this.
     */
    public constructor() {
        this.kc = new KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(CoreV1Api);
    }

    public stop(): void {
        for (const req of Object.values(this.watchRequests)) {
            req.abort();
        }
    }

    /**
     * Get uri to the API for your custom resource.
     *
     * @param group The group of the custom resource
     * @param version The version of the custom resource
     * @param plural The plural name of the custom resource
     * @param namespace Optional namespace to include in the uri
     */
    public getCustomResourceApiUri(group: string, version: string, plural: string, namespace?: string): string {
        let path = group ? `/apis/${group}/${version}/` : `/api/${version}/`;
        if (namespace) {
            path += `namespaces/${namespace}/`;
        }
        path += plural;

        return this.k8sApi.basePath + path;
    }

    public watchResource = async (
        group: string,
        version: string,
        plural: string,
        namespace?: string
    ): Promise<void> => {
        const apiVersion = group ? `${group}/${version}` : `${version}`;
        const id = `${plural}.${apiVersion}`;

        this.resourcePathBuilders[id] = (meta: ResourceMeta): string =>
            this.getCustomResourceApiUri(group, version, plural, meta.namespace);

        let uri = group ? `/apis/${group}/${version}/` : `/api/${version}/`;
        if (namespace) {
            uri += `namespaces/${namespace}/`;
        }
        uri += plural;

        const watch = new Watch(this.kc);

        const startWatch = async (): Promise<void> =>
            watch
                .watch(
                    uri,
                    {},
                    (reason, apiObj) => {
                        //console.info(phase, MetaMapper(plural, apiObj));
                        const meta = {
                            meta: MetaMapper(plural, apiObj, reason),
                            object: apiObj,
                            type: reason as ResourceEventType,
                        };
                        console.info(meta.meta);
                    },
                    (err) => {
                        if (err) {
                            console.error(`watch on resource ${id} failed: ${errorToJson(err)}`);
                            process.exit(1);
                        }
                        console.debug(`restarting watch on resource ${id}`);
                        setTimeout(startWatch, 200);
                    }
                )
                .catch((reason) => {
                    console.error(`watch on resource ${id} failed: ${errorToJson(reason)}`);
                    process.exit(1);
                })
                .then((req) => (this.watchRequests[id] = req));

        await startWatch();

        console.info(`watching resource ${id}`);
    };

    /**
     * Register a custom resource defintion.
     *
     * @param crdFile The path to the custom resource definition's YAML file
     */
    protected async registerCustomResourceDefinition(
        crdFile: string
    ): Promise<{
        group: string;
        versions: V1CustomResourceDefinitionVersion[] | V1beta1CustomResourceDefinitionVersion[] | undefined;
        plural: string;
    }> {
        const crd: V1CustomResourceDefinition | V1beta1CustomResourceDefinition = YAML.load(
            FS.readFileSync(crdFile, 'utf8')
        ) as any;

        if (typeof crd !== 'object') {
            return Promise.reject();
        }
        try {
            const apiVersion = crd.apiVersion;
            if (!apiVersion?.startsWith('apiextensions.k8s.io/')) {
                throw new Error("Invalid CRD yaml (expected 'apiextensions.k8s.io')");
            }
            if (apiVersion === 'apiextensions.k8s.io/v1beta1') {
                await this.kc
                    .makeApiClient(ApiextensionsV1beta1Api)
                    .createCustomResourceDefinition(crd as V1beta1CustomResourceDefinition);

                return {
                    group: crd.spec.group,
                    versions: crd.spec.versions,
                    plural: crd.spec.names.plural,
                };
            } else {
                await this.kc
                    .makeApiClient(ApiextensionsV1Api)
                    .createCustomResourceDefinition(crd as V1CustomResourceDefinition);

                return {
                    group: crd.spec.group,
                    versions: crd.spec.versions,
                    plural: crd.spec.names.plural,
                };
            }
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
    protected async setResourceStatus(meta: ResourceMeta, status: unknown): Promise<ResourceMeta | null> {
        return this.resourceStatusRequest('PUT', meta, status);
    }

    /**
     * Patch the status subresource of a custom resource (if it has one defined).
     *
     * @param meta The resource to update
     * @param status The status body to set in JSON Merge Patch format (https://tools.ietf.org/html/rfc7386)
     */
    protected async patchResourceStatus(meta: ResourceMeta, status: unknown): Promise<ResourceMeta | null> {
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
    protected async handleResourceFinalizer(
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
    protected async setResourceFinalizers(meta: ResourceMeta, finalizers: string[]): Promise<void> {
        const request: AxiosRequestConfig = {
            method: 'PATCH',
            url: `${this.resourcePathBuilders[meta.id](meta)}/${meta.name}`,
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

                return;
            }
        });
    }

    /**
     * Apply authentication to an axios request config.
     *
     * @param request the axios request config
     */
    protected async applyAxiosKubeConfigAuth(request: AxiosRequestConfig): Promise<void> {
        const opts: https.RequestOptions = {};
        await this.kc.applytoHTTPSOptions(opts);
        if (opts.headers?.Authorization) {
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
            url: `${this.resourcePathBuilders[meta.id](meta)}/${meta.name}/status`,
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

            return response ? MetaMapper(meta.id, response.data, method) : null;
        } catch (err) {
            console.error(errorToJson(err));

            return null;
        }
    }
}
