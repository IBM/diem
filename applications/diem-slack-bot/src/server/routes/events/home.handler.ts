import { utils } from '@common/utils';
import { api } from '../routes';

/* eslint-disable max-len */

const blocks = [
    {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: 'Hi, this is your Diem Bot. There are several options you can ask me',
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
General format: @Diem Bot <service> <action>

Action is depending on the service requested
Type "@Diem Bot service help" for more information
If you are in the Bot App, just type "service help"
            \`\`\``,
        },
    },
];

export const payloads = {
    welcome_home: (_context: any) => ({
        type: 'home',
        blocks,
    }),
    welcome_message: (context: any) => ({
        channel: context.channel,
        text: 'Hi, this is your Diem Bot. There are several options you can ask me',
        blocks,
    }),
    help_message: (context: any) => ({
        channel: context.channel,
        text: 'Hi, this is your Diem Bot. There are several options you can ask me',
        blocks,
    }),
};

export const homeHandler = async (event: any): Promise<boolean | any> => {
    if (event.tab === 'home') {
        utils.logInfo(`$event.home (handleHome): tab: home - user: ${event.user}`);

        await api.callAPIMethodPost('views.publish', {
            user_id: event.user,
            view: payloads.welcome_home(undefined),
        });

        return Promise.resolve(null);
    }

    if (event.tab === 'messages') {
        // only send initial message for the first time users opens the messages tab,
        // we can check for that by requesting the message history
        const history: any = await api.callAPIMethodGet('conversations.history', {
            channel: event.channel,
            limit: 1,
        });

        if (!history?.messages?.length) {
            utils.logInfo(`$event.home (handleHome): tab: messages - user: ${event.user}`);
            void api.callAPIMethodPost(
                'chat.postMessage',
                payloads.welcome_message({
                    channel: event.channel,
                })
            );
        } else {
            utils.logInfo(`$event.home (handleHome): tab: messages - returning user: ${event.user}`);
        }

        return Promise.resolve(null);
    }
};
