/* eslint-disable max-len */

/**
 * @property help: provides the help form
 * @property request: request the announcement form
 * @property fill: fill in the announcement form
 * @property confirm
 * @property finish
 * @property approve
 * @property reject
 * @propety announcement : the announcement
 */

const block_id = 'announcement';

export enum EActions {
    fill = 'fill',
    dismiss = 'dismiss',
    approve = 'approve',
    reject = 'reject',
    channel_id = 'channel_id',
    title_id = 'title_id',
    details_id = 'details_id',
    approver_id = 'approver_id',
}

export const payloads = {
    help: (context: any) => ({
        thread_ts: context.thread_ts,
        channel: context.channel,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'Hi, this is your Diem Bot. Here you can find a short summary about making announcements',
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `\`\`\`
General format: @Diem Bot <scope> <help|options>

scope: jobs
options: <start|stop|ouput|history> <dev|uat|prod> <$id|$name>

                    \`\`\``,
                },
            },
        ],
    }),
    request: (context: any) => ({
        thread_ts: context.thread_ts,
        channel: context.channel,
        text: ":announcement: Hello! I'm here to help your team make approved announcements into a channel.",
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: ":announcement: Hello! I'm here to help you make an annoucement into a channel.",
                },
            },
            {
                type: 'actions',
                block_id,
                elements: [
                    {
                        action_id: EActions.fill,
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Make Announcement',
                        },
                        style: 'primary',
                        value: 'make_announcement',
                    },
                    {
                        action_id: EActions.dismiss,
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Dismiss',
                        },
                        value: 'dismiss',
                    },
                ],
            },
        ],
    }),
    fill: (_context: any) => ({
        type: 'modal',
        title: {
            type: 'plain_text',
            text: 'Request an announcement',
        },
        callback_id: `${block_id}$request_announcement`,
        blocks: [
            {
                block_id: `${block_id}$title`,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: 'Title',
                },
                element: {
                    action_id: EActions.title_id,
                    type: 'plain_text_input',
                    max_length: 100,
                },
            },
            {
                block_id: `${block_id}$details`,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: 'Details',
                },
                element: {
                    action_id: EActions.details_id,
                    type: 'plain_text_input',
                    multiline: true,
                    max_length: 500,
                },
            },
            {
                block_id: `${block_id}$approver`,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: 'Select approver',
                },
                element: {
                    action_id: EActions.approver_id,
                    type: 'users_select',
                },
            },
            {
                block_id: `${block_id}$channel`,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: 'Select channel',
                },
                element: {
                    action_id: EActions.channel_id,
                    type: 'channels_select',
                },
            },
        ],
        submit: {
            type: 'plain_text',
            text: 'Next',
        },
    }),
    confirm: (context: any) => ({
        response_action: 'push',
        view: {
            callback_id: `${block_id}$confirm_announcement`,
            type: 'modal',
            title: {
                type: 'plain_text',
                text: 'Confirm Announcement',
            },
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*TITLE*',
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: context.announcement.title,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*DETAILS*',
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: context.announcement.details,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*APPROVER*',
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `<@${context.announcement.approver}>`,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*CHANNELS*',
                    },
                },
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: context.announcement.channelString,
                    },
                },
            ],
            close: {
                type: 'plain_text',
                text: 'Back',
            },
            submit: {
                type: 'plain_text',
                text: 'Submit',
            },
            private_metadata: JSON.stringify(context.announcement),
        },
    }),
    finish: (_context: any) => ({
        response_action: 'update',
        view: {
            callback_id: `${block_id}$finish_announcement`,
            clear_on_close: true,
            type: 'modal',
            title: {
                type: 'plain_text',
                text: 'Success :tada:',
                emoji: true,
            },
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: 'Your announcement has been sent for approval.',
                    },
                },
            ],
            close: {
                type: 'plain_text',
                text: 'Done',
            },
        },
    }),
    approve: (context: any) => ({
        channel: context.channel,
        text: `Announcement approval is requested by <@${context.requester}>`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<@${context.requester}> is requesting an announcement.`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `>>> *TITLE*\n${context.title}\n\n*DETAILS*\n${context.details}`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Requested channels: ${context.channelString}`,
                    },
                ],
            },
            {
                type: 'actions',
                block_id: `${block_id}$channel`,
                elements: [
                    {
                        action_id: EActions.approve,
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Approve',
                            emoji: true,
                        },
                        style: 'primary',
                        value: JSON.stringify(context),
                    },
                    {
                        action_id: EActions.reject,
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Reject',
                            emoji: true,
                        },
                        style: 'danger',
                        value: JSON.stringify(context),
                    },
                ],
            },
        ],
    }),
    reject: (context: any) => ({
        channel: context.channel,
        text: 'Your announcement has been rejected.',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'Your announcement has been rejected.',
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `>>> *TITLE*\n${context.title}\n\n*DETAILS*\n${context.details}`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Requested channels: ${context.channelString}`,
                    },
                ],
            },
        ],
    }),
    announcement: (context: any) => ({
        channel: context.channel,
        text: `:loudspeaker: Announcement from: <@${context.requester}>`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${context.title}*`,
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: context.details,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `:memo: Posted by <@${context.requester}>`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `:heavy_check_mark: Approved by <@${context.approver}>`,
                    },
                ],
            },
        ],
    }),
};
