/* eslint-disable @typescript-eslint/no-var-requires */
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const discoveryUrl = process.env.DISCOVERY_URL;
const callbackUrl = process.env.CALLBACK_URL;

const OpenIDConnectStrategy = require('passport-ci-oidc').IDaaSOIDCStrategy;

export const Strategy = new OpenIDConnectStrategy(
    {
        callbackURL: callbackUrl,
        clientID: clientId,
        clientSecret,
        discoveryURL: discoveryUrl,
        response_type: 'code',
        scope: 'openid email profile',
        skipUserProfile: true,
    },
    (_iss: any, _sub: any, profile: any, accessToken: any, refreshToken: any, _params: any, done: any) => {
        process.nextTick(() => {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            done(null, profile);
        });
    }
);
