/*jshint esversion: 8 */
import { connect, NatsConnection } from 'nats';

export interface IPayload {
    id: string | number;
    inbox?: string;
    client: number;
    payload?: any;
}

export const toBuf = (msg: {[index: string]: any} | string) => {
    if (typeof msg === 'string') {
        return Buffer.from(msg)
    }
    return Buffer.from(JSON.stringify(msg));
  };
  
  export const fromBuf = (buf: Uint8Array) => {
    if (!buf) {
      return "";
    }
    try {
      return JSON.parse(buf.toString());
    } catch (err) {
      return buf.toString();
    }
  };

class NCConnection {
    public nc!: NatsConnection;

    public connect = async (): Promise<NatsConnection> => {
        try {
            this.nc = await connect({
                servers: 'http://localhost:4222',
                user: 'nats_client',
                pass: 'es1admin',
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
                console.info(`$nats_connect (events): ${s.type}: ${s.data}`);
            }
        })();
    };
}

export const NC = new NCConnection();
