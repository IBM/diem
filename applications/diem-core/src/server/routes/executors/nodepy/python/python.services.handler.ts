/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { EJobTypes, IJobSchema, ECodeLanguage } from '@models';
import { base64encode, addTrace } from '@functions';
import { INodePyJob } from '../np.interfaces';
import { handleNodePyServicesCustomJob } from './python.handlers/handle.nodepy.services.custom';
import { handleNodePyServicesSelect } from './python.handlers/handle.nodepy.services.select';
import { handleNodePyServicesRestJob } from './python.handlers/handle.nodepy.services.rest';
import { handleConnectionParams } from './python.code.handlers/handle.connection.params';
import { handleConfigmapsParams } from './python.code.handlers/handle.configmaps.params';
import { handlePrintStatement } from './python.code.handlers/handle.print.statement';
import { handleSnippets } from './python.code.handlers/handle.snippets';
import { handleConfigmaps } from './python.code.handlers/handle.configmaps';
import { handleFiles } from './python.code.handlers/handle.files';
import { handleCos } from './python.code.handlers/handle.cos';
import { handleMail } from './python.code.handlers/handle.mail';
import { handleValues, setValues } from './python.code.handlers/handle.values';
import { handlePipServices } from './python.code.handlers/handle.pip.services';

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath: string = '/tmp/spark-local-dir';

const py_start_services: (doc: IJobSchema) => string = (doc: IJobSchema): string => String.raw`### py_start ###

import time
import os
import diemlib.config as config
from diemlib.main import *

env = os.environ

config.__id = '${doc._id.toString()}'
config.__email = '${doc.job.email}'
config.__jobid = '${doc.job.jobid}'
config.__serviceid = '${doc.job.serviceid}'
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

###__CODE__###`;

/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const pythonServicesHandler: (doc: IJobSchema) => Promise<INodePyJob> = async (
    doc: IJobSchema
): Promise<INodePyJob> => {
    try {
        let code: string = py_start_services(doc);
        const id: string = doc._id.toString();

        /* These are transformations we need to do at the start */
        if (doc.job.params) {
            // if the job has a config map
            if (doc.job.params.configmaps) {
                code = await handleConfigmaps(code, doc.project.org, doc.job.params.configmaps);
            }

            // pip packages
            if (doc.job.params.pip) {
                code = await handlePipServices(code, doc);
            }

            if (doc.job.params.values) {
                code = await setValues(code, doc.job.params.values);
            }

            // if the job contains files
            if (doc.job.params.files) {
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
            code = await handleNodePyServicesCustomJob(code, doc);
        } else if (doc.type === EJobTypes.pystmt && doc.stmt && doc.stmt.type) {
            code = await handleNodePyServicesSelect(code, doc);
        } else if (doc.type === EJobTypes.urlgetpost && doc.url) {
            code = await handleNodePyServicesRestJob(code, doc);
        }

        /* These are transformations we need to do at the end , they are mostly string replace */

        // check if this code uses snippets
        code = await handleSnippets(code, doc.project.org);

        if (doc.job.params) {
            if (doc.job.params.connections) {
                code = await handleConnectionParams(code, doc.job.params.connections, doc.project.org);
            }

            if (doc.job.params.values) {
                code = await handleValues(code, doc.job.params.values);
            }

            if (doc.job.params.configmaps) {
                code = await handleConfigmapsParams(code, doc.job.params.configmaps, doc.project.org);
            }
        }

        // there are parameters here, so sanitize the code

        // only handle files if there are files in an array
        code = handlePrintStatement(code);

        // we need to base64encode this file

        const nodepyJob: INodePyJob = {
            ...doc.job,
            id,
            org: doc.project.org,
            params: doc.job.params,
            language: ECodeLanguage.python,
            code: base64encode(code),
        };

        return Promise.resolve(nodepyJob);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.nodepy (handleNodePy)');
        err.message = `No nodepy job could be created for doc: ${doc.name} - name: ${doc.name}`;

        return Promise.reject(err);
    }
};
