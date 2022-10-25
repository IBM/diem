/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { EJobTypes, IJobSchema, ECodeLanguage } from '@models';
import { base64encode, addTrace } from '@functions';
import { INodePyJob } from '../np.interfaces';
import { handleNodePyTransferJob } from './nodepy.job.handlers/handle.nodepy.transfer';
import { handleNodePyCustomJob } from './nodepy.job.handlers/handle.nodepy.custom';
import { handleNodeStmtJob } from './nodepy.job.handlers/handle.nodepy.stmt';
import { handleNodePySelect } from './nodepy.job.handlers/handle.nodepy.select';
import { handleNodePyRestJob } from './nodepy.job.handlers/handle.nodepy.rest';
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

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath = process.env.localdir || '/tmp/spark-local-dir';

const py_start: (doc: IJobSchema) => string = (doc: IJobSchema): string => String.raw`### python.handler (py_start) ###

import os
import sys
import time

import diemlib.config as config
from diemlib.main import *

env = os.environ

config.__id = '${doc._id}'
config.__email = '${doc.job.email}'
config.__jobid = '${doc.job.jobid}'
config.__name = '${doc.name}'
config.__filepath = '${filepath}'
config.__transid = '${doc.job.transid}'
config.__org = '${doc.project.org}'
config.__count = 0
config.__starttime = time.time()
config.__jobstart = UtcNow()
config.__nats = True
config.__appname = '${process.env.NAME}'
config.__K8_SYSTEM = '${process.env.K8_SYSTEM}'

os.remove(sys.argv[0])

def diem_except_hook(exctype, value, traceback):
    error(value)
sys.excepthook = diem_except_hook

data = {
    "jobstart": config.__jobstart,
    "status": "Running",
    "out": f"Job {config.__id} started - email: {config.__email} - time: {UtcNow()}",
}
mq(data)

startTimer()

###__CODE__###`;

/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const pythonHandler: (doc: IJobSchema) => Promise<INodePyJob> = async (doc: IJobSchema): Promise<INodePyJob> => {
    try {
        let code: string = py_start(doc);
        const id: string = doc._id.toString();

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
                    code = await handleFiles(
                        code,
                        doc.job.params.files.loadfiles as { name: string; value: string }[],
                        doc.job.params.files.loadfiles_type
                    );
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
            code = await handleNodePySelect(code, doc);
        } else if (doc.type === EJobTypes.pystmt && doc.stmt) {
            code = await handleNodeStmtJob(code, doc);
        } else if (doc.type === EJobTypes.urlgetpost && doc.url) {
            code = await handleNodePyRestJob(code, doc);
        } else if (doc.type === EJobTypes.pyspark && doc.config) {
            code = await handleNodePyTransferJob(code, doc);
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
                code = await handleFilesParams(code, params.files.loadfiles as { name: string; value: string }[]);
            }
        }

        // there are parameters here, so sanitize the code

        // only handle files if there are files in an array
        code = handlePrintStatement(code);

        // we need to base64encode this file
        const nodepyJob: INodePyJob = {
            ...doc.job,
            code: base64encode(code),
            id,
            language: ECodeLanguage.python,
            org: doc.project.org,
            params: doc.job.params,
        };

        return Promise.resolve(nodepyJob);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $python.handler (handleNodePy)');

        return Promise.reject(err);
    }
};
