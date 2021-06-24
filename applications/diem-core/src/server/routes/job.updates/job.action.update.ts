/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { parse } from 'yaml';
import { EStoreActions, IntPayload, IntServerPayload, IntSharedAction } from '@interfaces';
import { DataModel, EJobStatus, EJobTypes, ExecutorTypes, IJobBody, IJobSchema, IJobModel } from '@models';
import { extract__, expand, addTrace } from '@functions';
import { nextSchedule } from '../job.backend/job.functions';
import { makePayload } from '../job.front/job.detail';

const detail_store: string = 'jobdetail.store';
const update_request: string = 'Update Request';

const isObject: any = (item: any) => item && typeof item === 'object' && !Array.isArray(item) && item !== null;

/**
 * Deep merge two objects.
 *
 * @param target
 * @param source
 */
export const mergeDeep: any = (target: any, source: any) => {
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach((key) => {
            if (isObject(source[key])) {
                if (key !== '__proto__' && (!target[key] || !isObject(target[key]))) {
                    target[key] = source[key];
                }
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        });
    }

    return target;
};

export const actionUpdate: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    /* get the id here */

    let isNew: boolean = false;

    let doc: IJobModel | null;

    if (!body.id) {
        doc = new DataModel();
        body.id = doc._id.toString();

        doc.annotations = {
            createdbyemail: body.email,
            createdbyname: body.username,
            createddate: new Date(),
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        };

        // is this really needed ?
        doc.job = {
            count: null,
            email: body.email,
            executor: ExecutorTypes.nodepy, // might be overwritten so we take nodepy as default
            jobend: null,
            jobid: body.id,
            jobstart: new Date(),
            runby: 'user',
            runtime: null,
            status: EJobStatus.pending,
            transid: body.transid,
            name: doc.name,
        };

        doc.tags = [];
        doc.log = [];
        doc.out = [];
        isNew = true;
    } else {
        doc = await DataModel.findOne({ _id: body.id }).exec();
    }

    if (doc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            name: update_request,
            trace: ['@at $job.action (actionUpdate)'],
        });
    }

    const id: string = doc._id.toString();

    // the name has changed ?

    if (body.name && body.name !== doc.name) {
        doc.name = body.name.trim();
    }

    if (body.about && body.about !== doc.about) {
        doc.about = body.about;
    }

    if (body.description && body.description !== doc.description) {
        doc.description = body.description.trim();
    }

    if (body.tags && doc.tags && doc.tags.length !== body.tags.length) {
        doc.tags = body.tags;
    }

    if (body.type && body.type !== doc.type) {
        doc.type = body.type;
    }

    if (doc.type === EJobTypes.pycustom) {
        if (!doc.custom) {
            doc.custom = {
                code: body.custom__code || '# Your python code goes here',
                executor: body.custom__executor || 'nodepy',
            };
        } else {
            if (body.custom__code) {
                doc.custom.code = body.custom__code;
            }

            if (body.custom__executor) {
                doc.custom.executor = body.custom__executor;
            }
        }
    }

    if (doc.type === EJobTypes.pystmt) {
        if (!doc.stmt) {
            doc.stmt = {
                type: body.stmt__type !== undefined ? body.stmt__type : undefined, // default is false
                sql: '/* your code goes here */',
            } as IJobSchema['stmt'];
        } else {
            if (body.stmt__type !== undefined) {
                doc.stmt.type = body.stmt__type;
            }
            if (body.stmt__connection) {
                doc.stmt.connection = body.stmt__connection;
            }
            if (body.stmt__sql) {
                doc.stmt.sql = body.stmt__sql.replace(/[\t\n\r]/gm, ' ');
            }
        }
    }

    if (doc.type === EJobTypes.urlgetpost) {
        if (!doc.url) {
            doc.url = {} as IJobSchema['url'];
        } else {
            if (body.url__body) {
                doc.url.body = body.url__body;
            }
            if (body.url__headers) {
                doc.url.headers = body.url__headers;
            }
            if (body.url__type) {
                doc.url.type = body.url__type;
            }
            if (body.url__url) {
                doc.url.url = body.url__url;
            }
        }
    }

    if (doc.type === EJobTypes.pyspark) {
        if (body.source__sql) {
            // replace tabs newlines and ; as we don't need them
            body.source__sql = body.source__sql ? body.source__sql.replace(/[\t\n\r]/gm, ' ').replace(/;/g, '') : '';
        }
        if (body.target__truncate) {
            body.target__truncate = body.target__truncate || false;
        }

        const env2: any = expand(extract__(body, '__'), '__');

        doc.config = mergeDeep(doc.toObject().config || {}, env2);
    }

    if (body.job__params) {
        if (Object.entries(body.job__params).length > 0) {
            let yaml: any;
            try {
                yaml = parse(body.job__params);
            } catch (err) {
                return Promise.reject({
                    status: 301,
                    displayerr: `Params parsing error:\n ${err.message || ''}`,
                });
            }
            const params: any = expand(yaml, '__');
            doc.job.params = params && Object.entries(params).length > 0 ? params : undefined;
        } else if (doc.job.params) {
            doc.job.params = undefined;
        }
    }

    if (!doc.mail) {
        doc.mail = {
            enabled: true,
            delivery: '0',
            recipients: [],
        };
    }

    if (body.mail__enabled !== undefined) {
        doc.mail.enabled = body.mail__enabled;
    }
    if (body.mail__delivery) {
        doc.mail.delivery = body.mail__delivery;
    }
    if (body.mail__recipients) {
        doc.mail.recipients = body.mail__recipients;
    }

    if (!doc.schedule) {
        doc.schedule = {
            cronNbr: null,
            cronTime: null,
            enabled: false,
            lastExecution: null,
            lastExecutionTime: null,
            nextExecution: null,
            nextExecutionTime: null,
        };
    }

    if (body.schedule__enabled !== undefined) {
        doc.schedule.enabled = body.schedule__enabled;
        if (doc.schedule.enabled === false) {
            doc.schedule.nextExecutionTime = null;
            doc.schedule.nextExecution = null;
        }
    }

    if (
        doc.schedule.enabled &&
        body.schedule__cronTime !== undefined &&
        body.schedule__cronTime !== '' &&
        body.schedule__cronTime !== doc.schedule.cronTime
    ) {
        doc.schedule.cronTime = body.schedule__cronTime;
        try {
            doc.schedule = { ...nextSchedule(doc) };
        } catch (err) {
            return Promise.reject({
                status: 301,
                displayerr: `Schedule format parsing error:\n ${err.message || ''}`,
            });
        }
    } else if (doc.schedule.enabled && !doc.schedule.nextExecutionTime) {
        doc.schedule = { ...nextSchedule(doc) };
    }

    if (body.schedule__cronTime === '') {
        doc.schedule = {
            cronNbr: null,
            cronTime: null,
            enabled: false,
            lastExecution: null,
            lastExecutionTime: null,
            nextExecution: null,
            nextExecutionTime: null,
        };
    }

    if (doc.schedule.enabled && !doc.schedule.cronTime) {
        doc.schedule.enabled = false;
    }

    if (!doc.project) {
        doc.project = {
            org: body.org,
            orgscope: body.orgscope || 'default',
        };
    } else {
        doc.project.org = body.org || doc.project.org;
        doc.project.orgscope = body.orgscope || doc.project.orgscope;
    }

    // doc.markModified('schedule');
    doc.markModified('mail');

    doc.set({
        annotations: {
            createdbyemail: doc.annotations.createdbyemail || body.email,
            createdbyname: doc.annotations.createdbyname || body.username,
            createddate: doc.annotations.createddate || new Date(),
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
    });

    try {
        const upd_doc: any = await doc.save().catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.action (actionUpdate) - save');

            return Promise.reject(err);
        });

        let sharedActions: IntSharedAction[] = [];

        let payload: IntPayload[] = [];

        if (isNew) {
            sharedActions = [
                {
                    params: {
                        route: `/jobdetail/${doc._id.toString()}`,
                    },
                    sessionid: body.sessionid,
                    type: 'route',
                },
            ];
        } else {
            sharedActions = [
                {
                    target: 'jobdetail.general.form',
                    targetid: id,
                    type: 'read',
                },
            ];

            payload = [
                {
                    key: 'id',
                    loaded: true,
                    store: detail_store /** not used as forcestore is enabled */,
                    targetid: id,
                    type: EStoreActions.UPD_STORE_FORM_RCD,
                    values: await makePayload(upd_doc.toObject()),
                },
            ];
        }

        const serverPayload: IntServerPayload = {
            actions: sharedActions,
            message: 'Job Updated',
            payload,
            success: true /** just display a success message */,
        };

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.action (actionUpdate)');

        return Promise.reject(err);
    }
};
