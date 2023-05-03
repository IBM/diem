import { IConnSchema, IJobConfig, IJobSchema, ITemplatesModel } from '@models';
import { addTrace } from '@functions';
import { ISrc, ITgt } from '../spark.interfaces';
import { py_partition, py_opt_dropcolumns, py_tgt_jdbc, py_session, py_conn_src, py_tgt_nz } from '../spark.pycode/py';
import { lookupTemplate } from '../../../job.front/job.template';
import { handleValues } from '../../nodepy/python/python.code.handlers/handle.values';
import { getConnection } from './handle.spark.common';

const codestring = '###__CODE__###';

export const handleWithConfig: (doc: IJobSchema, code: string) => Promise<string> = async (
    doc: IJobSchema,
    code: string
): Promise<string> => {
    const id: string = doc._id.toString();
    if (!doc.config) {
        const err: any = {
            message: `No config file found - job: ${id}`,
            trace: ['@at $spark.handle.config (handleConfig)'],
        };

        return Promise.reject(err);
    }

    const config: IJobConfig = doc.config;

    const local: string =
        doc.job.params?.spark?.local && doc.job.audit?.spark?.executor_cores
            ? `.master("local[${doc.job.audit.spark.executor_cores}]")`
            : '';

    code = code.replace(codestring, py_session(local));

    if (config.source) {
        const source: IJobConfig['source'] = config.source;

        let connection: IConnSchema;

        try {
            connection = await getConnection(doc.project.org, config.source.connection);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.config (source)');

            return Promise.reject(err);
        }

        const src: ISrc = { ...connection, ...source };

        if (doc.templateid) {
            const templ: ITemplatesModel | null = await lookupTemplate(doc.templateid);

            if (templ?.template) {
                src.sql = templ.template;
            }
        }

        const partition: string = src.partition && src.partition.partitioncolumn ? py_partition(src.partition) : '';

        let py_src: string = py_conn_src(src, partition);

        // the Partition Part

        py_src =
            src.partition && src.partition.partitioncolumn
                ? py_src.replace(/\$PARTITION/g, py_partition(src.partition))
                : py_src.replace(/\$PARTITION/g, '\n###__CODE__###');

        code = code.replace(codestring, py_src);

        if (
            src.dropcolumns &&
            Array.isArray(src.dropcolumns) &&
            src.dropcolumns.length > 0 &&
            src.dropcolumns[0] !== ''
        ) {
            const opt_dropcolumns: string = py_opt_dropcolumns(`.drop("${src.dropcolumns.join('"),.drop("')}")`);

            code = code.replace(codestring, opt_dropcolumns);
        } else {
            code = code.replace(codestring, 'df_tgt = df_src###__CODE__###');
        }
    }

    if (config.target) {
        const target: IJobConfig['target'] = config.target;

        let connection: IConnSchema;

        try {
            connection = await getConnection(doc.project.org, config.target.connection);
        } catch (err) {
            err.trace = addTrace(err.trace, '@at $spark.config (target)');

            return Promise.reject(err);
        }

        const tgt: ITgt = { ...connection, ...target };

        tgt.truncate = !!tgt.truncate;

        const target_txt: string = tgt.type === 'nz' ? py_tgt_nz(tgt) : py_tgt_jdbc(tgt);
        code = code.replace(codestring, target_txt);
    }

    if (doc.job.params?.values) {
        code = await handleValues(code, doc.job.params.values);
    }

    // here we create the final construct

    return Promise.resolve(code);
};
