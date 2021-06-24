/* eslint-disable complexity */

import { ECodeLanguage, IJobSchema } from '@models';
import { base64encode, addTrace } from '@functions';
import { INodePyJob } from '../np.interfaces';

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath: string = '/tmp/spark-local-dir';

export const javascript_start: (doc: IJobSchema) => string = (doc: IJobSchema): string => String.raw`
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

msg = __\`Job __\${config.__id} started - email: __\${config.__email} - time: __\${UtcNow()}__\`

data = {
    jobstart: config.__jobstart,
    status: "Running",
    out: msg,
}
mq(data)

console.log = function() {}

/* ###__CODE__### */`;

export const javascript_end: () => string = (): string => String.raw`
/* javascript_end */

msg = __\`Job __\${config.__id} finished - time: __\${UtcNow()} - running time: __\${(TimeNow() - config.__starttime).toFixed(3)} ms__\`

data = {
    status: "Completed",
    out: msg,
    jobend: UtcNow()
}
mq(data)

/* ###__CODE__### */;`;

/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const javascriptHandler: (doc: IJobSchema) => Promise<INodePyJob> = async (
    doc: IJobSchema
): Promise<INodePyJob> => {
    try {
        let code: string = javascript_start(doc);
        const id: string = doc._id.toString();

        if (doc.custom?.code) {
            code = code.replace('/* ###__CODE__### */', `\n${doc.custom.code}\n/* ###__CODE__### */`);
        }

        code = code.replace('/* ###__CODE__### */', javascript_end);

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
