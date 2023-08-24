import { OICUser } from '@interfaces';
import { Issuer, Strategy as OpenIdStrategy, BaseClient, custom } from 'openid-client';
import { Credentials } from './cfenv';

interface ISSO {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    jwks_uri: string;
}

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const callbackUrl = process.env.CALLBACK_URL;

const sso_credentials: ISSO = Credentials('sso');

custom.setHttpOptionsDefaults({
    timeout: 15000,
});

let discovery_endpoint = process.env.DISCOVERY_URL;
if (discovery_endpoint?.includes('/.well-known/')) {
    discovery_endpoint = discovery_endpoint.split('/.well-known/')[0];
}

let baseClient: Issuer<BaseClient>;

if (discovery_endpoint) {
    baseClient = await Issuer.discover(discovery_endpoint);
} else {
    baseClient = new Issuer({
        issuer: sso_credentials.issuer,
        authorization_endpoint: sso_credentials.authorization_endpoint,
        token_endpoint: sso_credentials.token_endpoint,
        userinfo_endpoint: sso_credentials.userinfo_endpoint,
        jwks_uri: sso_credentials.jwks_uri,
    });
}

const client = new baseClient.Client({
    client_id: clientId || 'na',
    client_secret: clientSecret,
    redirect_uris: [callbackUrl || 'na'],
    response_types: ['code'],
});

export const Strategy = new OpenIdStrategy(
    {
        client,
    },
    (_tokenSet: any, profile: unknown, done: any) => {
        process.nextTick(() => {
            done(null, profile as OICUser);
        });
    }
);
