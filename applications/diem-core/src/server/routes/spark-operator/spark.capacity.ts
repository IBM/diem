/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
/* eslint-disable max-len */

import { utils } from '@common/utils';
import * as Api from 'kubernetes-client';
import { IJobParams, IModel } from '@models';
import { ICrdConfig } from './base.crd';

export interface IBaseCapacity {
    nodes: number;
    cores: number;
    memory: string;
    mem_mb: number;
    mem_gb: number;
    mem_core: number;
}

const capacity: IBaseCapacity = {
    cores: 0,
    memory: '',
    mem_mb: 0,
    mem_gb: 0,
    mem_core: 0,
    nodes: 0,
};

const setCap: () => void = async () => {
    const apiClient: Api.ApiClient = Api.Client1_13;

    const client: Api.ApiRoot = new apiClient({ version: '1.13' });

    const node: any = await client.api.v1.nodes.get();

    const status: any = node.body.items[0].status;

    const mem_mb = Number(status.capacity.memory.replace('Ki', ''));

    capacity.mem_gb = 0;

    if (typeof mem_mb === 'number') {
        capacity.mem_gb = Math.ceil((mem_mb / 1024 / 1024) * 0.8);
    }

    /**
     *
     * i changed from 2 to 4 as we have now an additional node available
     * before
     * cpu (8-2) x 2 = 12  for prod  (32-2) x 2 = 60
     * now
     * cpu (8-4) x 3 = 12  for prod  (32-4) x 3 = 84
     */
    capacity.cores = Number(status.capacity.cpu - 4);
    capacity.memory = status.capacity.memory;
    capacity.nodes = node.body.items.length;

    capacity.mem_core = Math.round(capacity.mem_gb / capacity.cores);

    utils.logInfo(
        `$spark.capacity (setCap): nodes: ${capacity.nodes} - cores: ${capacity.cores} - memory: ${capacity.memory}`
    );
};

setCap();

/**
 *
 *
 * @param {IETLJob} job
 * @returns
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const caclCap: (doc: IModel, crdjob: ICrdConfig) => ICrdConfig = (
    doc: IModel,
    crdjob: ICrdConfig
): ICrdConfig => {
    // in case we habe only one node, we can only run in local mode, this will be seen by the pyfile loading

    const id: string = doc._id.toString();

    // set the default values for cores and memory
    // we take 25 % of the available numbers
    // this overwrites the default
    crdjob.spec.driver.cores = Math.round(capacity.cores / 4);
    crdjob.spec.executor.cores = Math.round(capacity.cores / 4);

    utils.logInfo(
        `$spark.capacity (caclCap): current capacity - job:  ${id} - cores: ${capacity.cores} - mem: ${capacity.memory} - nodes: ${capacity.nodes}`,
        `ti: ${doc.job.transid}`
    );

    const spark: IJobParams['spark'] | undefined = doc.job.params?.spark;

    if (spark) {
        if (spark.driver?.cores) {
            crdjob.spec.driver.cores = capacity.cores >= spark.driver.cores ? spark.driver.cores : capacity.cores;

            // swap the default memory for local
        }

        if (spark.executor?.cores) {
            crdjob.spec.executor.cores = capacity.cores >= spark.executor.cores ? spark.executor.cores : capacity.cores;
        }

        if (spark.driver?.memory) {
            // overwriting driver memory
            crdjob.spec.driver.memory = spark.driver.memory.toLowerCase(); // swap memory
        }

        if (spark.executor?.memory) {
            // overwriting executor memory
            crdjob.spec.executor.memory = spark.executor.memory.toLowerCase(); // swap memory
        }

        if (spark.executor?.instances) {
            // overwriting executor instances with a maximum of 5
            const icap: number = capacity.nodes > 5 ? 5 : capacity.nodes;
            crdjob.spec.executor.instances = spark.executor.instances > icap ? icap : spark.executor.instances; // swap memory
        }

        if (spark.local) {
            // overwriting executor instances with a maximum of 5
            crdjob.spec.executor.instances = 1; // swap memory
        }
    }

    /* no job ! or job but no config */

    if (!doc.config) {
        crdjob.spec.executor.coreRequest =
            (Math.round((crdjob.spec.executor.cores / 3) * 100) / 100).toString() || undefined;

        crdjob.spec.driver.coreRequest =
            (Math.round((crdjob.spec.driver.cores / 3) * 100) / 100).toString() || undefined;

        utils.logInfo(
            `$spark.capacity (caclCap): default custom:  ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances} - e_cores: ${crdjob.spec.executor.cores} - d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
            `ti: ${doc.job.transid}`
        );

        return crdjob;
    }

    /* let's check if partioning is being asked */

    const numpartitions: number = doc.config.source?.partition?.numpartitions
        ? doc.config.source.partition.numpartitions
        : 0;

    /** Should not happen as managed via nodepy */
    if (numpartitions === 0) {
        utils.logInfo(
            `$spark.capacity (caclCap): no partitioning - job: ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances} - e_cores: ${crdjob.spec.executor.cores} - d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
            `ti: ${doc.job.transid}`
        );

        return crdjob;
    }

    /* First we need to calculate the number of available nodes */

    const available_nodes: number = capacity.nodes;

    if (available_nodes <= 1) {
        /**
         * in this unlike scenario, probably local, we only have the driver node
         * so we run it on that driver node with all processors
         */

        /* we have less partitions requested then we have cores */

        crdjob.spec.executor.cores =
            numpartitions <= crdjob.spec.executor.cores ? numpartitions : crdjob.spec.executor.cores;

        if (!spark?.executor?.memory) {
            crdjob.spec.executor.memory = `${capacity.mem_core * crdjob.spec.executor.cores}g`;
        }

        crdjob.spec.executor.coreRequest =
            (Math.round((crdjob.spec.executor.cores / 3) * 100) / 100).toString() || undefined;

        crdjob.spec.driver.coreRequest =
            (Math.round((crdjob.spec.driver.cores / 3) * 100) / 100).toString() || undefined;

        utils.logInfo(
            `$spark.capacity (caclCap): running on single node - job:  ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances} - e_cores: ${crdjob.spec.executor.cores}- d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
            `ti: ${doc.job.transid}`
        );

        console.info(crdjob.spec);

        return crdjob;
    }

    /**
     * We have enough resources
     *
     * there are 2 possibilities
     *
     * 1. we have requested more partitions then the maximum we can assign, in that case we assign the ideal spread
     * 2. we need to optimize the executors and cores per executors
     *
     */
    crdjob.spec.executor.cores = 5; // this is the ideal number per node capacity.cores; // eg 12 cpu per node
    crdjob.spec.executor.memory = `${capacity.mem_core * crdjob.spec.executor.cores}g`;

    if (numpartitions >= 30) {
        // hard maximum assigning 30 in total  5 x 6
        // 5

        crdjob.spec.executor.instances = capacity.nodes > 5 ? 6 : capacity.nodes; // 30 / 5
        crdjob.spec.executor.cores = Math.round(30 / crdjob.spec.executor.instances);

        if (doc.config.source.partition?.maxcpu) {
            const cpu: number = doc.config.source.partition.maxcpu;

            if (cpu >= 30) {
                utils.logInfo(
                    `$spark.capacity (caclCap): max config crdjob.spec. - job:  ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances} - e_cores: ${crdjob.spec.executor.cores} - d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
                    `ti: ${doc.job.transid}`
                );

                return crdjob;
            } else if (cpu <= 7) {
                crdjob.spec.executor.instances = 1; // 30 / 5
                crdjob.spec.executor.cores = cpu;
            } else if (cpu <= 14) {
                crdjob.spec.executor.instances = 2; // 30 / 5
                crdjob.spec.executor.cores = 7;
            } else if (cpu <= 21) {
                crdjob.spec.executor.instances = 3; // 30 / 5
                crdjob.spec.executor.cores = 7;
            } else if (cpu < 30) {
                crdjob.spec.executor.instances = 5; // 30 / 5
                crdjob.spec.executor.cores = 6;
            }
        }

        utils.logInfo(
            `$spark.capacity (caclCap): max crdjob.spec. - job:  ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances} - e_cores: ${crdjob.spec.executor.cores} - d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
            `ti: ${doc.job.transid}`
        );

        return crdjob;
    }

    // we need to figure out if 6 5 or 4 fits best
    /*

    Math.ceil(13/6) = 2 * 6  = 18
    Math.ceil(13/5) = 3 * 5  = 15   -> winner
    Math.ceil(13/4) = 4 * 4  = 16

    Math.ceil(12/6) = 2 * 6  = 12 -> winner
    Math.ceil(12/5) = 3 * 5  = 15
    Math.ceil(12/4) = 3 * 4  = 12 -> winner

    Math.ceil(8/6) = 2 * 6  = 12
    Math.ceil(8/5) = 2 * 5  = 10
    Math.ceil(8/4) = 2 * 4  = 8 -> winner

    */

    const calc_instances: (nump: number) => number = (nump: number): number => {
        const tests: number[] = [6, 5, 4];
        const calc: number[] = [];

        tests.forEach((test: number) => {
            const t: number = Math.ceil(nump / test) * test;
            calc.push(t);
        });

        // find the lowest number
        const min: number = Math.min.apply(null, calc);

        const index: number = calc.findIndex((c: number) => c === min) || 0;

        return tests[index];
    };

    crdjob.spec.executor.cores = calc_instances(numpartitions); // devide and roound it up

    crdjob.spec.executor.instances = Math.ceil(numpartitions / crdjob.spec.executor.cores); // devide and roound it up

    crdjob.spec.executor.memory = `${capacity.mem_core * crdjob.spec.executor.cores}g`;

    crdjob.spec.executor.coreRequest =
        (Math.round((crdjob.spec.executor.cores / 3) * 100) / 100).toString() || undefined;

    crdjob.spec.driver.coreRequest = (Math.round((crdjob.spec.driver.cores / 3) * 100) / 100).toString() || undefined;

    utils.logInfo(
        `$spark.capacity (caclCap): calculated - job:  ${id} - d_cores: ${crdjob.spec.driver.cores} - e_inst: ${crdjob.spec.executor.instances}  - e_cores: ${crdjob.spec.executor.cores}- d_mem: ${crdjob.spec.driver.memory} - e_mem: ${crdjob.spec.executor.memory}`,
        `ti: ${doc.job.transid}`
    );

    /*
    $spark.capacity (caclCap): available - nodes: 9 - cores: 12 - memory: 65785812Ki
    $spark.capacity (caclCap): balanced capacity d_cores: 1 - e_inst: 2 - e_cores: 12
    */

    return crdjob;
};
