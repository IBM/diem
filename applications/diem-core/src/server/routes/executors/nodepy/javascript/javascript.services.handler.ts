/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { ECodeLanguage, IJobSchema } from '@models';
import { base64encode, addTrace } from '@functions';
import { INodePyJob } from '../np.interfaces';
import { handleConfigmapsParams } from '../python/python.code.handlers/handle.configmaps.params';
import { handleConnectionParams } from '../python/python.code.handlers/handle.connection.params';
import { handleSnippets } from '../python/python.code.handlers/handle.snippets';
import { handleValues } from '../python/python.code.handlers/handle.values';

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath: string = '/tmp/spark-local-dir';

const javascript_start: (doc: IJobSchema) => string = (doc: IJobSchema): string => String.raw`
/* javascript_start */

/*jshint esversion: 6 */

const moment = require('moment');

const mq = (data) => {
    data.id =  config.__id;
    data.jobid =  config.__jobid;
    data.transid =  config.__transid;
    data.email =  config.__email;
    data.name =  config.__name;

    if (data.out  && typeof data.out !== 'string') {
        try {
            data.out = JSON.stringify(data.out, undefined, 2)
        } catch (err) {
            /* nothing */
        }
    }

    process.stdout.write(JSON.stringify(data)+ '\n');

};

const out = (data) => {
    mq({ out: data });
};

const error = (err) => {
    now = time.strftime("%Y-%m-%d %H:%M:%S")

    data = {
        email: config.__email,
        error: err.toString(),
        id: config.__id,
        jobid: config.__jobid,
        jobend: now,
        name: config.__name,
        status: "Failed",
        out: __\`Job {config.__id} failed - time: {UtcNow()} - runtime: {(TimeNow() - config.__starttime).toFixed(3)} ms__\`
    };

    mq(data);
    process.exit();
};

const UtcNow = () => {
    return moment.utc(new Date(), 'YYYY-MM-DD HH:mm:ss')
}

const TimeNow = () => {
    return new Date().getTime() / 1000
}

const config = {
    __id : '${doc._id}',
    __email : '${doc.job.email}',
    __jobid : '${doc.job.jobid}',
    __name : '${doc.name}',
    __filepath : '${filepath}',
    __transid : '${doc.job.transid}',
    __org : '${doc.project.org}',
    __count : 0,
    __starttime : new Date().getTime() / 1000,
    __jobstart : new Date()
}

console.log = function() {}

/* ###__CODE__### */`;

/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const javascriptServicesHandler: (doc: IJobSchema) => Promise<INodePyJob> = async (
    doc: IJobSchema
): Promise<INodePyJob> => {
    try {
        let code: string = javascript_start(doc);
        const id: string = doc._id.toString();

        if (doc.custom?.code) {
            code = code.replace('/* ###__CODE__### */', `\n${doc.custom.code}\n/* ###__CODE__### */`);
        }

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

        const regExp: string | RegExp = new RegExp('__\\\\', 'ig');
        code = code.replace(regExp, '');

        // we need to base64encode this file
        const nodepy: INodePyJob = {
            ...doc.job,
            code: base64encode(code),
            id,
            language: ECodeLanguage.javascript,
            org: doc.project.org,
            params: doc.job.params,
        };

        return Promise.resolve(nodepy);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.nodepy (handleNodePy)');
        err.message = `No nodepy job could be created for doc: ${doc.name} - name: ${doc.name}`;

        return Promise.reject(err);
    }
};
