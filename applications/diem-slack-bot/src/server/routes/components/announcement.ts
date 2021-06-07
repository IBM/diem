import { utils } from '@common/utils';
import { IResponse } from '@interfaces';
import { api } from '../routes';
import { payloads, EActions } from './announcement.payload';

export const announcementComponent = async (event: any, args: string[]): Promise<any> => {
    if (args[1] && args[1] === 'help') {
        await api.callAPIMethodPost(
            'chat.postMessage',
            payloads.help({
                callback_id: 'announcement',
                thread_ts: event.thread_ts ? event.thread_ts : event.event_ts,
                channel: event.channel,
            })
        );

        return;
    }

    await api.callAPIMethodPost(
        'chat.postMessage',
        payloads.request({
            thread_ts: event.thread_ts ? event.thread_ts : event.event_ts,
            block_id: 'announcement',
            channel: event.channel,
        })
    );

    utils.logInfo(`$announcement (annoucementMethods): new announcement request - user: ${event.user}`);
};

export const announcementBlockActions = async (payload: any, action: any): Promise<any> => {
    let announcement: any = {};

    if (action.action_id === EActions.fill) {
        await api.callAPIMethodPost('views.open', {
            trigger_id: payload.trigger_id,
            view: payloads.fill(undefined),
        });

        return utils.logInfo(`$announcement (annoucementMethods): sending form - action: ${action.action_id}`);
    }

    if (action.action_id === EActions.dismiss) {
        await api.callAPIMethodPost('chat.delete', {
            channel: payload.channel.id,
            ts: payload.message.ts,
        });

        return utils.logInfo(`$announcement (annoucementMethods): dismissing form - action: ${action.action_id}`);
    }

    if (action.action_id === EActions.approve) {
        announcement = JSON.parse(action.value);

        await api.callAPIMethodPost('chat.update', {
            channel: payload.channel.id,
            ts: payload.message.ts,
            text: 'Thanks! This post has been announced.',
            blocks: null,
        });

        if (announcement.channels) {
            announcement.channels.forEach(async (channel: string) => {
                await api.callAPIMethodPost(
                    'chat.postMessage',
                    payloads.announcement({
                        channel,
                        title: announcement.title,
                        details: announcement.details,
                        requester: announcement.requester,
                        approver: announcement.approver,
                    })
                );
            });
        }

        return utils.logInfo(
            `$announcement (annoucementMethods): announcment approved and posted - action: ${action.action_id}`
        );
    }

    if (action.action_id === EActions.reject) {
        announcement = JSON.parse(action.value);

        await api.callAPIMethodPost('chat.update', {
            channel: payload.channel.id,
            ts: payload.message.ts,
            text: 'This request has been denied. I am letting the requester know!',
            blocks: null,
        });

        // 2. send a notification to the requester
        const res = await api.callAPIMethodPost('conversations.open', {
            users: announcement.requester,
        });
        await api.callAPIMethodPost(
            'chat.postMessage',
            payloads.reject({
                channel: res.channel.id,
                title: announcement.title,
                details: announcement.details,
                channelString: announcement.channelString,
            })
        );

        return utils.logInfo(
            `$announcement (annoucementMethods): approval has been rejected - action: ${action.action_id}`
        );
    }

    utils.logInfo(`$announcement (annoucementMethods): unknow action : ${action.action_id}`);
};

export const announcementViewActions = async (payload: any, res: IResponse, action: string) => {
    if (action === 'request_announcement') {
        const values = payload.view.state.values;
        const channel = values?.announcement$channel?.channel_id?.selected_channel;
        const channelString = `<#${channel}>`;

        // respond with a stacked modal to the user to confirm selection
        const announcement = {
            title: values.announcement$title.title_id.value,
            details: values.announcement$details.details_id.value,
            approver: values.announcement$approver.approver_id.selected_user,
            channels: [channel],
            channelString,
        };

        utils.logInfo(`$announcement (announcementViewActions): confirm your announcement : ${action}`);

        return res.send(
            payloads.confirm({
                announcement,
            })
        );
    }

    if (action === 'confirm_announcement') {
        const submission = JSON.parse(payload.view.private_metadata);

        const response = await api.callAPIMethodPost('conversations.open', {
            users: submission.approver,
        });
        submission.requester = payload.user.id;
        submission.channel = response.channel.id;
        await api.callAPIMethodPost('chat.postMessage', payloads.approve(submission));

        utils.logInfo(`$announcement (announcementViewActions): request approval : ${action}`);

        return res.send(payloads.finish(undefined));
    }

    return utils.logInfo(`$announcement (announcementViewActions): unknow view action : ${action}`);
};
