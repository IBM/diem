/* eslint-disable max-len */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/quotes */

import { slackMsg } from '@common/slack/slack';
import { ISlack, utils } from '@common/utils';
import { IJobModel, EJobTypes, IWebhooksSchema } from '@models';
import { IError } from '@interfaces';
import { fmtTime, makeUrl } from '@functions';
import { getwebhook } from '../webhooks/webhooks';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line sonarjs/cognitive-complexity
export const toSlack: (doc: IJobModel) => Promise<void> = async (doc: IJobModel): Promise<void> => {
    const id: string = doc._id.toString();

    const isPl: boolean = doc.type === EJobTypes.pipeline;
    const jobkind: string = isPl ? 'pipeline' : 'job';

    if (
        doc.job &&
        doc.job.params &&
        doc.job.params.slack &&
        (doc.job.params.slack.disabled === true || doc.job.params.slack.enabled === false)
    ) {
        utils.logInfo(`$slack.logger (toSlack): slack disabled by params - ${jobkind}: ${id}`);

        return Promise.resolve();
    }

    const url: string = makeUrl({
        text: doc.name,
        url: `jobdetail/${id}`,
    });

    const pipeline_url: string = makeUrl({
        text: 'Link to Pipeline',
        url: `jobdetail/${doc.job.jobid}`,
    });

    const org: string = doc.project.org || 'ETL Manager';

    const fromPipeline: boolean = doc.job.jobid !== id;

    const jobType: string = isPl ? 'Pipeline' : 'Job';

    const { email, executor, runby, status, count } = doc.job;

    const runtime: number = doc.job.runtime || 0;

    // eslint-disable-next-line max-len
    // const info: any = `🗣 \`status: ${pipeline}${status} - job: ${url} - runby: ${runby} - email: ${email} - rt: ${runtime} - rc: ${count} - id: ${id} - pid: ${process.pid}\``;
    // eslint-disable-next-line max-len
    const info: any = `🗣 \`status: ${jobType} ${status} - name: ${doc.name} - runby: ${runby} - email: ${email} - rt: ${runtime} - rc: ${count} - id: ${id}`;

    utils.logInfo(info, doc.job.transid);

    const customSlack: Partial<ISlack> = {
        deploy: {
            channel: `${utils.slack.user.channel}`,
            username: 'ETL Manager (Notification)',
        },
    };

    if (doc.job.params && doc.job.params.slack) {
        if (doc.job.params.slack.channel && customSlack && customSlack.deploy && customSlack.deploy.channel) {
            customSlack.deploy.channel = doc.job.params.slack.channel;
        }

        if (doc.job.params.slack.username && customSlack && customSlack.deploy && customSlack.deploy.username) {
            customSlack.deploy.username = doc.job.params.slack.username;
        }

        if (doc.job.params.slack.webhook) {
            utils.logInfo(`$slack.logger (toSlack): using custom slack for ${jobkind}: ${id}`);

            const slack: any = doc.job.params.slack;

            // let us first check if there's a condition for the status

            if (slack.status) {
                let allowed: boolean = false; //let's take worse case

                // there is a status
                if (Array.isArray(slack.status) && slack.status.includes(doc.job.status)) {
                    //it is an arry of status

                    allowed = true;
                }

                if (typeof slack.status === 'string' && slack.status === doc.job.status) {
                    //it is a value but the status is not the one allowed
                    allowed = true;
                }

                if (!allowed) {
                    utils.logInfo(
                        `$slack.logger (toSlack): block - status: ${doc.job.status} - allowed: ${slack.status} - ${jobkind}: ${id}`
                    );

                    return Promise.resolve();
                }
            }
            const webhook: IWebhooksSchema | void = await getwebhook(slack.webhook).catch(async () => {
                utils.logInfo(`$slack.logger (toSlack): no url found for ${jobkind}: ${id}`);
            });

            if (webhook && webhook.webhook) {
                customSlack.url = webhook.webhook;
            }
        }
    }

    let emoji: string = isPl ? ':ok:' : ':information_source:';
    let color: string = '#ececec';

    if (['Failed'].includes(status)) {
        emoji = isPl ? ':x:' : ':heavy_exclamation_mark:';
        color = isPl ? '#da1e28' : '#fa4d56'; // alt '#e71d32';
    } else if (['Stopped'].includes(status)) {
        emoji = isPl ? ':stop-2:' : ':stop22:';
        color = '#FF8C00'; // alt '#e71d32';
    } else if (status === 'Completed') {
        emoji = isPl ? ':heavy_check_mark:' : ':white_check_mark:';
        color = isPl ? '#24a148' : '#42be65';
    } else {
        color = isPl ? '#4589ff' : '#a8a8a8';
    }

    const fields: { value: string; short: boolean }[] = [
        {
            value: `*Status:* ${jobType} ${status}`,
            short: true,
        },
        {
            value: `*Job:* ${url}`,
            short: true,
        },
        {
            value: `*Run by:* ${runby} - ${process.pid}`,
            short: true,
        },
        {
            value: `*Email:* ${email}`,
            short: true,
        },

        {
            value: `*Id:* ${id}`,
            short: true,
        },
        {
            value: `*Process:* ${doc.type} - ${executor || 'etl'}`,
            short: true,
        },
    ];

    if (fromPipeline) {
        fields.push({
            value: `*Pipeline Id:* ${pipeline_url}`,
            short: true,
        });
    }

    if (status !== 'Submitted') {
        fields.splice(4, 0, {
            value: `*Run time:* ${fmtTime(runtime)}`,
            short: true,
        });

        fields.splice(5, 0, {
            value: `*Records:* ${count ? count.toLocaleString('en') : 0}`,
            short: true,
        });
    }

    const footer: string = `${utils.Env.K8_SYSTEM_NAME} - ${utils.Env.packname}@${utils.Env.version} - ${process.version}`;
    const msg: {
        attachments: any;
        caller?: string;
        transid: string;
    } = {
        transid: doc.job.transid,
        caller: '$slack.logger',
        attachments: [
            {
                mrkdwn_in: ['text', 'value', 'pretext'],
                color,
                text: `${emoji}   *${org.toUpperCase()}: ${jobType} ${status}*`,
                fields,
                footer,
            },
        ],
    };

    await slackMsg(msg, customSlack).catch(async (err: IError) => {
        utils.logErr('$error (slackrMsg)', err);
    });

    return Promise.resolve();
};
