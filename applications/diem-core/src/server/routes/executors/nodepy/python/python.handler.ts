/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { IETLJob, EJobTypes, IJobSchema, ECodeLanguage } from '@models';
import { base64encode, addTrace } from '@functions';
import { INodePyJob } from '../np.interfaces';
import { py_start } from './python.code/py';
import { handleNodePyTransferJob } from './python.handlers/handle.nodepy.transfer';
import { handleNodePyCustomJob } from './python.handlers/handle.nodepy.custom';
import { handleNodePyStmtJob } from './python.handlers/handle.nodepy.pystmt';
import { handleNodePySelect } from './python.handlers/handle.nodepy.select';
import { handleNodePyRestJob } from './python.handlers/handle.nodepy.rest';
import { handleConnectionParams } from './python.code.handlers/handle.connection.params';
import { handleConfigmapsParams } from './python.code.handlers/handle.configmaps.params';
import { handlePrintStatement } from './python.code.handlers/handle.print.statement';
import { handleSnippets } from './python.code.handlers/handle.snippets';
import { handleConfigmaps } from './python.code.handlers/handle.configmaps';
import { handleFiles, handleFilesParams } from './python.code.handlers/handle.files';
import { handleCos } from './python.code.handlers/handle.cos';
import { handleMail } from './python.code.handlers/handle.mail';
import { handleValues, setValues } from './python.code.handlers/handle.values';
import { handlePip } from './python.code.handlers/handle.pip';
/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const pythonHandler: (doc: IJobSchema, job: IETLJob) => Promise<INodePyJob> = async (
    doc: IJobSchema,
    job: IETLJob
): Promise<INodePyJob> => {
    try {
        let code: string = py_start(job);

        /* These are transformations we need to do at the start */
        if (doc.job.params) {
            // if the job has a config map
            if (doc.job.params.configmaps) {
                code = await handleConfigmaps(code, doc.project.org, doc.job.params.configmaps);
            }

            // pip packages
            if (doc.job.params.pip) {
                code = await handlePip(code, doc);
            }

            if (doc.job.params.values) {
                code = await setValues(code, doc.job.params.values);
            }

            // if the job contains files
            if (doc.job.params.files) {
                // the connection to the cos instance, custom or from k8

                code = await handleCos(code, doc.project.org, doc.job.params.files);

                if (
                    doc.job.params.files &&
                    typeof doc.job.params.files !== 'boolean' &&
                    doc.job.params.files.loadfiles &&
                    Object.keys(doc.job.params.files.loadfiles).length > 0
                ) {
                    code = await handleFiles(code, doc.job.params.files.loadfiles, doc.job.params.files.loadfiles_type);
                }
            }

            if (doc.job.params.mail) {
                // the connection to the cos instance, custom or from k8

                const configmap: string | undefined = doc.job.params.mail.api_key
                    ? doc.job.params.mail.api_key
                    : undefined;

                code = await handleMail(code, doc.job.params.mail, doc.project.org, configmap);
            }
        }

        /* These are the job types transformation */
        if (doc.type === EJobTypes.pycustom && doc.custom) {
            code = await handleNodePyCustomJob(code, doc);
        } else if (doc.type === EJobTypes.pystmt && doc.stmt && doc.stmt.type) {
            code = await handleNodePySelect(code, {
                ...job,
                stmt: doc.stmt,
            });
        } else if (doc.type === EJobTypes.pystmt && doc.stmt) {
            code = await handleNodePyStmtJob(code, {
                ...job,
                stmt: doc.stmt,
            });
        } else if (doc.type === EJobTypes.urlgetpost && doc.url) {
            code = await handleNodePyRestJob(code, {
                ...job,
                url: doc.url,
            });
        } else if (doc.type === EJobTypes.pyspark && doc.config) {
            code = await handleNodePyTransferJob(code, {
                ...job,
                config: doc.config,
            });
        }

        /* These are transformations we need to do at the end , they are mostly string replace */

        // check if this code uses snippets
        code = await handleSnippets(code, doc.project.org);

        if (doc.job.params) {
            const params = doc.job.params;
            if (params.connections) {
                code = await handleConnectionParams(code, params.connections, doc.project.org);
            }

            if (params.values) {
                code = await handleValues(code, params.values);
            }

            if (params.configmaps) {
                code = await handleConfigmapsParams(code, params.configmaps, doc.project.org);
            }

            if (
                params.files &&
                typeof params.files !== 'boolean' &&
                params.files.loadfiles &&
                Object.keys(params.files.loadfiles).length > 0
            ) {
                code = await handleFilesParams(code, params.files.loadfiles);
            }
        }

        // there are parameters here, so sanitize the code

        // only handle files if there are files in an array
        code = handlePrintStatement(code);

        // we need to base64encode this file
        const pubJob: INodePyJob = {
            ...job,
            language: ECodeLanguage.python,
            code: base64encode(code),
        };

        return Promise.resolve(pubJob || undefined);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $python.handler (handleNodePy)');

        return Promise.reject(err);
    }
};
