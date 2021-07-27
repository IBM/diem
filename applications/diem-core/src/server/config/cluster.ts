import { utils } from '@common/utils';
import { KubeConfig, CoreV1Api, V1NodeList, V1NodeStatus } from '@kubernetes/client-node';

interface ICapacity {
    nodes: number;
    cpu: number;
    memory: number;
}

class Cluster {
    public kc: KubeConfig;
    public k8sApi: CoreV1Api;
    public capacity: ICapacity;

    public constructor() {
        this.kc = new KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(CoreV1Api);
        this.capacity = {
            nodes: 1,
            cpu: 1,
            memory: 1000000,
        };
        void this.baseparam();
    }

    private baseparam = async () => {
        try {
            const nodelist: {
                response: any;
                body: V1NodeList;
            } = await this.k8sApi.listNode();

            const nodes: number = nodelist.body.items.length;

            if (nodelist.body.items[0]?.status?.capacity) {
                const capacity: V1NodeStatus['capacity'] = nodelist.body.items[0].status.capacity;

                this.capacity = {
                    nodes,
                    cpu: Number(capacity.cpu),
                    memory: Number(capacity.memory.replace('Ki', '')),
                };
            }
            utils.logInfo(
                `$cluster (baseparam): cluster nodes: ${this.capacity.nodes} - cpu: ${this.capacity.cpu} - memory: ${this.capacity.memory}`
            );
        } catch (err) {
            console.error(err);
        }
    };
}

export const cluster: Cluster = new Cluster();
