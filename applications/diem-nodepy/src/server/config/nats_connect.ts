/*jshint esversion: 8 */
import { connect, NatsConnection, JSONCodec, StringCodec } from 'nats';
import { Credentials } from '../common/cfenv';

const jc = JSONCodec();
const sc = StringCodec();

export interface IPayload {
    id: string | number;
    inbox?: string;
    client: number;
    data?: any;
}

interface INatsCredentials {
    clusterpassword: string;
    clustertoken?: string;
    clusteruser: string;
    ip: string;
    password: string;
    token?: string;
    user: string;
}

export const toBuff = (msg: { [index: string]: any } | string) => {
    if (typeof msg === 'string') {
        return sc.encode(msg);
    }

    return jc.encode(JSON.stringify(msg));
};

export const fromBuff = (buf: Uint8Array): IPayload | string | undefined => {
    if (!buf) {
        return undefined;
    }
    try {
        const t: unknown = jc.decode(buf);
        if (t && typeof t === 'object') {
            return t as IPayload;
        }

        return undefined;
    } catch (err) {
        return sc.decode(buf);
    }
};

class NCConnection {
    private nc!: NatsConnection;

    public connect = async (): Promise<NatsConnection> => {
        const credentials: INatsCredentials = Credentials('nats');

        try {
            this.nc = await connect({
                servers: `${credentials.ip}:4222`,
                user: credentials.user,
                pass: credentials.password,
                name: 'Diem Connection',
            });

            this.events();

            return Promise.resolve(this.nc);
        } catch (err) {
            console.error('$nats_connect (connect): error', err);

            return Promise.reject({ message: 'could not connect' });
        }
    };

    private events = () => {
        void (async () => {
            console.info(`$nats_connect (connect): connected to nats - ${this.nc.getServer()}`);
            for await (const s of this.nc.status()) {
                if (s.type === 'update') {
                    console.info(`$connect (events): ${s.type}`, s.data);
                } else {
                    console.info(`$connect (events): ${s.type} - data: ${s.data}`);
                }
            }
        })();
    };
}

export const NC = new NCConnection();
