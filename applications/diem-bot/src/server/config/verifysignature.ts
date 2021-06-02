/*eslint no-bitwise: ["error", { "allow": ["~"] }] */
import { createHmac } from 'crypto';
import { IRequest } from '@interfaces';
import timingSafeCompare from 'tsscmp';

export const isVerified = (req: IRequest) => {
    const signature = req.headers['x-slack-signature'];

    if (!signature || typeof signature !== 'string') {
        return false;
    }

    if (!process.env.slackSigningSecret) {
        return false;
    }

    const timestamp = req.headers['x-slack-request-timestamp'];
    const hmac = createHmac('sha256', process.env.slackSigningSecret);
    const [version, hash] = signature.split('=');

    // Check if the timestamp is too old
    const fiveMinutesAgo = ~~(Date.now() / 1000) - 60 * 5;
    if (Number(timestamp) < fiveMinutesAgo) {
        return false;
    }

    hmac.update(`${version}:${timestamp}:${req.rawBody}`);

    // check that the request signature matches expected value
    return timingSafeCompare(hmac.digest('hex'), hash);
};
