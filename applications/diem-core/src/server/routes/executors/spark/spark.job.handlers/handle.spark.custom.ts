/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-useless-escape */
/* eslint-disable max-len */
import { IJobSchema } from '@models';
import { handleConnectionParams } from '../../nodepy/python/python.code.handlers/handle.connection.params';
import { handleConfigmaps } from '../../nodepy/python/python.code.handlers/handle.configmaps';
import { py_start, py_session } from '../spark.pycode/py';
import { handleSnippets } from '../../nodepy/python/python.code.handlers/handle.snippets';
import { handleCos } from '../../nodepy/python/python.code.handlers/handle.cos';
import { handleFiles } from '../../nodepy/python/python.code.handlers/handle.files';
import { handleValues } from '../../nodepy/python/python.code.handlers/handle.values';
import { handleConfigmapsParams } from '../../nodepy/python/python.code.handlers/handle.configmaps.params';

// eslint-disable-next-line sonarjs/cognitive-complexity

export const handleWithCustom: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    const id: string = doc._id.toString();
    if (!doc.custom || (doc.custom && !doc.custom.code)) {
        const err: any = {
            message: `No custom code found - job: ${id}`,
            trace: ['@at $spark.handle.config (handleConfig)'],
        };

        return Promise.reject(err);
    }

    let code: string = py_start();

    // no need to append this to the code as construct will take this later
    if (doc.job.params && doc.job.params.configmaps) {
        code = await handleConfigmaps(code, doc.project.org, doc.job.params.configmaps);
    }

    // same code as in nodepy

    if (doc.job.params && doc.job.params.files) {
        // the connection to the cos instance, custom or from k8

        code = await handleCos(code, doc.project.org, doc.job.params.files);

        // here we have list of files to load
        if (
            typeof doc.job.params.files !== 'boolean' &&
            doc.job.params.files.loadfiles &&
            Array.isArray(doc.job.params.files.loadfiles) &&
            doc.job.params.files.loadfiles.length > 0
        ) {
            code = await handleFiles(code, doc.job.params.files.loadfiles);
        }
    }

    /**
     * Custom Code
     *
     * Custom Code can have either a dedicarted number that must be less or equal to 10
     * or if absent we always allocated 5 cpu
     */

    let spark_local: number = 5;
    if (
        doc.job.params &&
        doc.job.params.spark &&
        doc.job.params.spark.local &&
        Number(doc.job.params.spark.local) < 11
    ) {
        spark_local = doc.job.params.spark.local;
    }
    const local = `.master("local[${spark_local}]")`;
    code = code.replace('######', py_session(local));

    const custom_code: string = `
### py_session ###

${doc.custom.code}

endjob()

######`;

    code = code.replace('######', custom_code);

    code = await handleSnippets(code, doc.project.org);

    if (doc.job.params) {
        if (doc.job.params.connections) {
            // there are parameters that might overwrite the job settings
            code = await handleConnectionParams(code, doc.job.params.connections, doc.project.org);
        }

        if (doc.job.params.values) {
            code = await handleValues(code, doc.job.params.values);
        }

        if (doc.job.params.configmaps) {
            code = await handleConfigmapsParams(code, doc.job.params.configmaps, doc.project.org);
        }
    }

    return Promise.resolve(code);
};
