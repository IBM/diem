'use strict';

import { utils } from '@common/utils';
import axios from 'axios';
const apiUrl = 'https://slack.com/api';

const token = process.env.bot_token;

export const thisbot = {
    id: 'noname',
    key: '<#nokey',
};

const whoAmI: () => Promise<any> = async () => {
    const whoami: { user_id: string; ok: boolean } = await api.callAPIMethodGet('auth.test', {});

    thisbot.id = whoami.user_id;
    thisbot.key = `<@${whoami.user_id}>`; // see the extra space

    utils.logInfo(`$events (whoAmI): botuser: ${thisbot.id} - key: ${thisbot.key} - ready: ${whoami.ok}`);
};

/**
 * helper function to call POST methods of Slack API
 */
export const callAPIMethodPost = async (method: any, payload: any) => {
    const result = await axios.post<any>(`${apiUrl}/${method}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return result.data;
};

export const callAPIMethodPostFile = async (method: string, payload: any) => {
    const result = await axios.post<any>(`${apiUrl}/${method}`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded' },
    });

    return result.data;
};

const callAPIFileGet = async (url: string) => {
    const result = await axios.get<any>(url, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return Promise.resolve(result.data);
};

/**
 * helper function to call GET methods of Slack API
 */
const callAPIMethodGet = async (method: any, payload: any) => {
    const params = Object.keys(payload)
        .map((key) => `${key}=${payload[key]}`)
        .join('&');
    const result = await axios.get<any>(`${apiUrl}/${method}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return result.data;
};

/**
 * helper function to receive all channels our bot user is a member of
 */
const getChannels = async (userId: string, channels: any, cursor: any): Promise<any> => {
    channels = channels || [];

    const payload = {
        cursor: undefined,
    };
    if (cursor) {
        payload.cursor = cursor;
    }
    const result = await callAPIMethodPost('users.conversations', payload);
    channels = channels.concat(result.channels);
    if (
        result.response_metadata &&
        result.response_metadata.next_cursor &&
        result.response_metadata.next_cursor.length
    ) {
        return getChannels(userId, channels, result.response_metadata.next_cursor);
    }

    return channels;
};

export const api = {
    callAPIFileGet,
    callAPIMethodGet,
    callAPIMethodPost,
    callAPIMethodPostFile,
    getChannels,
    whoAmI,
};
