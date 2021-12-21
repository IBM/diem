/*jshint esversion: 8 */
import { setTimeout } from 'timers/promises';
import { connect, NatsConnection, JSONCodec, StringCodec, nkeyAuthenticator } from 'nats';
import { Credentials } from './cfenv';
import { publisher } from './nats_publisher';
import { utils } from './utils';

const jc = JSONCodec();
const sc = StringCodec();

let retry = 0;

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

    public connect = async (): Promise<NatsConnection | void> => {
        if (this.nc) {
            return this.nc;
        }

        const credentials: INatsCredentials = Credentials('nats');

        try {
            if (credentials.seed) {
                console.info('$nats_connect (connect): connecting using seed...');
                this.nc = await connect({
                    servers: `${credentials.ip}:4222`,
                    authenticator: nkeyAuthenticator(Buffer.from(credentials.seed)),
                    name: 'Diem Operator',
                });
            } else if (credentials.user && credentials.password) {
                console.info('$nats_connect (connect): connecting using user & pass...');
                this.nc = await connect({
                    servers: `${credentials.ip}:4222`,
                    user: credentials.user,
                    pass: credentials.password,
                    name: 'Diem Operator',
                });
            } else {
                return Promise.reject({ message: 'No Authentication' });
            }

            void this.events();

            await publisher.connect(this.nc);

            return Promise.resolve(this.nc);
        } catch (err) {
            await utils.logError('nats_connect (connect): error', {
                retry,
                message: err.message,
                caller: '$nats_connect',
                code: err.code,
                name: 'Nats connection error',
            });

            await setTimeout(10000);
            await this.connect();

            retry += 1;
        }
    };

    private events = async () => {
        await (async () => {
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
