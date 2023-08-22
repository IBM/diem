/*jshint esversion: 8 */
import { utils } from '@common/utils';
import { INatsCredentials, INatsPayload, IntInternal } from '@interfaces';
import { connect, NatsConnection, JSONCodec, StringCodec, nkeyAuthenticator, NatsError } from 'nats';
import { Credentials } from '../common/cfenv';
import { publisher } from './nats_publisher';
import { subscriber } from './nats_subscriber';

let retry = 0;

export interface INatsError extends NatsError {
    trace: string[];
}

const jc = JSONCodec();
const sc = StringCodec();

export const toBuff = (msg: INatsPayload) => {
    if (typeof msg === 'string') {
        return sc.encode(msg);
    }

    return jc.encode(msg);
};

export const fromBuff = (buf: Uint8Array): INatsPayload | undefined => {
    if (!buf) {
        return undefined;
    }
    try {
        const t: unknown = jc.decode(buf);
        if (t && typeof t === 'object') {
            return t as INatsPayload;
        }

        return undefined;
    } catch (err) {
        return undefined;
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
                    servers: `${credentials.ip}:${credentials.port || '4222'}`,
                    authenticator: nkeyAuthenticator(Buffer.from(credentials.seed)),
                    name: 'Diem Nodepy',
                });
            } else if (credentials.user && credentials.password) {
                console.info('$nats_connect (connect): connecting using user & pass...');
                this.nc = await connect({
                    servers: `${credentials.ip}:${credentials.port || '4222'}`,
                    user: credentials.user,
                    pass: credentials.password,
                    name: 'Diem Nodepy',
                });
            } else {
                return Promise.reject({ message: 'No Authentication' });
            }

            this.events();

            await subscriber.connect(this.nc);
            await publisher.connect(this.nc);

            if (retry > 0) {
                const internal: IntInternal = {
                    fatal: false,
                    message: 'Nats Reconnected',
                    pid: process.pid,
                    source: '$nats_connect',
                    trace: ['$nats_connect (connect)'],
                };

                utils.emit('internal', internal);
            }

            return Promise.resolve(this.nc);
        } catch (err) {
            retry += 1;

            setTimeout(() => {
                void this.connect();
            }, 10000);

            const internal: IntInternal = {
                retry,
                err: err.code,
                fatal: true,
                message: 'Nats Connection Error',
                pid: process.pid,
                source: '$nats_connect',
                trace: ['$nats_connect (connect)'],
            };

            utils.emit('internal', internal);
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
