/*jshint esversion: 8 */
import { connect, NatsConnection } from 'nats';
import { Credentials } from '../common/cfenv';

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

export const toBuf = (msg: { [index: string]: any } | string) => {
    if (typeof msg === 'string') {
        return Buffer.from(msg);
    }

    return Buffer.from(JSON.stringify(msg));
};

export const fromBuf = (buf: Uint8Array) => {
    if (!buf) {
        return '';
    }
    try {
        return JSON.parse(buf.toString());
    } catch (err) {
        return buf.toString();
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
            console.error('$nats_connect (connect): connecting');
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
