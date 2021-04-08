/*jshint esversion: 8 */
import { connect, NatsConnection, JSONCodec, StringCodec, nkeyAuthenticator } from 'nats';
import { Credentials } from './cfenv';
import { utils } from './utils';

const jc = JSONCodec();
const sc = StringCodec();

export interface IPayload {
    inbox?: string;
    client: string;
    data?: any;
    sid?: number; // number used when the message has an id
}

interface INatsCredentials {
    clusterpassword: string;
    clustertoken?: string;
    clusteruser: string;
    ip: string;
    password?: string;
    token?: string;
    user?: string;
    seed?: string;
}

export const toBuff = (msg: IPayload) => {
    if (typeof msg === 'string') {
        return sc.encode(msg);
    }

    return jc.encode(msg);
};

export const fromBuff = (buf: Uint8Array): IPayload | string | undefined => {
    if (!buf) {
        return undefined;
    }
    try {
        const t: unknown = jc.decode(buf);
        if (t && typeof t === 'object') {
            return t as IPayload;
        } else if (t && typeof t === 'string') {
            return sc.decode(buf);
        }

        return undefined;
    } catch (err) {
        return sc.decode(buf);
    }
};

class NCConnection {
    private nc!: NatsConnection;

    public connect = async (): Promise<NatsConnection> => {
        if (this.nc) {
            return this.nc;
        }

        const credentials: INatsCredentials = Credentials('nats');

        try {
            if (credentials.seed) {
                console.error('$nats_connect (connect): connecting using seed...');
                this.nc = await connect({
                    servers: `${credentials.ip}:4222`,
                    authenticator: nkeyAuthenticator(Buffer.from(credentials.seed)),
                    name: 'Diem Nodepy',
                });
            } else if (credentials.user && credentials.password) {
                console.error('$nats_connect (connect): connecting using user & pass...');
                this.nc = await connect({
                    servers: `${credentials.ip}:4222`,
                    user: credentials.user,
                    pass: credentials.password,
                    name: 'Diem Nodepy',
                });
            } else {
                return Promise.reject({ message: 'No Authentication' });
            }

            this.events();

            return Promise.resolve(this.nc);
        } catch (err) {
            void utils.logError('$nats_connect (connect): error', err);

            return Promise.reject({ message: 'could not connect' });
        }
    };

    private events = () => {
        void (async () => {
            if (this.nc.info) {
                const info = this.nc.info;
                utils.logInfo(
                    `$nats_connect (connect): connected - ${this.nc.getServer()} - cluster: ${info.cluster} - server: ${
                        info.server_name
                    }`
                );
            } else {
                utils.logInfo(`$nats_connect (connect): connected - ${this.nc.getServer()}`);
            }
            for await (const s of this.nc.status()) {
                if (s.type === 'update') {
                    utils.logInfo(`$connect (events): ${s.type} - data: ${JSON.stringify(s.data)}`);
                } else {
                    utils.logInfo(`$connect (events): ${s.type} - data: ${s.data}`);
                }
            }
        })();
    };
}

export const NC = new NCConnection();
