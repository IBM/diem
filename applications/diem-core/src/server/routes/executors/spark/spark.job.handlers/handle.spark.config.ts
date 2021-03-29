/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-useless-escape */

/* eslint-disable max-len */

import { IConnSchema, IJobConfig, IJobSchema } from '@models';
import { addTrace } from '../../../shared/functions';
import { ISrc, ITgt } from '../spark.interfaces';

import {
    py_start,
    py_partition,
    py_opt_dropcolumns,
    py_tgt_jdbc,
    py_session,
    py_conn_src,
    py_tgt_nz,
} from '../spark.pycode/py';
import { getConnection } from './hendle.spark.common';

// eslint-disable-next-line sonarjs/cognitive-complexity

export const handleWithConfig: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    const id: string = doc._id.toString();
    if (!doc.config) {
        const err: any = {
            message: `No config file found - job: ${id}`,
            trace: ['@at $spark.handle.config (handleConfig)'],
        };

        return Promise.reject(err);
    }

    const config: IJobConfig = doc.config;

    let code: string = py_start();

    const local: string =
        doc.job.audit && doc.job.audit.spark && doc.job.audit.spark.nodes <= 1
            ? `.master("local[${doc.job.audit.spark.driver_cores}]")`
            : '';

    code = code.replace('######', py_session(local));

    if (config.source) {
        const source: IJobConfig['source'] = config.source;

        let connection: IConnSchema;

        try {
            connection = await getConnection(config.source.connection);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.config (source)');

            return Promise.reject(err);
        }

        const src: ISrc = { ...connection, ...source };

        const partition: string = src.partition && src.partition.partitioncolumn ? py_partition(src.partition) : '';

        let py_src: string = py_conn_src(src, partition);

        // the Partition Part

        py_src =
            src.partition && src.partition.partitioncolumn
                ? py_src.replace(/\$PARTITION/g, py_partition(src.partition))
                : py_src.replace(/\$PARTITION/g, '\n######');

        code = code.replace('######', py_src);

        if (
            src.dropcolumns &&
            Array.isArray(src.dropcolumns) &&
            src.dropcolumns.length > 0 &&
            src.dropcolumns[0] !== ''
        ) {
            const opt_dropcolumns: string = py_opt_dropcolumns(`.drop("${src.dropcolumns.join('"),.drop("')}")`);

            code = code.replace('######', opt_dropcolumns);
        } else {
            code = code.replace('######', 'df_tgt = df_src######');
        }
    }

    if (config.target) {
        const target: IJobConfig['target'] = config.target;

        let connection: IConnSchema;

        try {
            connection = await getConnection(config.target.connection);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.config (target)');

            return Promise.reject(err);
        }

        const tgt: ITgt = { ...connection, ...target };

        tgt.truncate = !!tgt.truncate;

        const target_txt: string = tgt.type === 'nz' ? py_tgt_nz(tgt) : py_tgt_jdbc(tgt);
        code = code.replace('######', target_txt);
    }

    // here we create the final construct

    return Promise.resolve(code);
};
