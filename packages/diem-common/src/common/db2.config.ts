import { Pool } from 'ibm_db';
import { Credentials } from './cfenv';
import { utils } from './utils';
export { Database } from 'ibm_db';

export { Pool } from 'ibm_db';

export interface IDB2Conn {
    connString: string;
    ibmdb: Pool;
}

export class DB2Config {
    public conn: IDB2Conn;

    public constructor(db: string) {
        const datab: any = Credentials(db);
        this.conn = this.getConn(datab);
        // `debug(true);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public getConn = (datab: any): IDB2Conn => {
        let conn: IDB2Conn;

        if (datab.arm) {
            utils.logInfo(
                // eslint-disable-next-line max-len
                `$db2config (getConn): Using DB2 SSL - db: ${datab.db} - host: ${datab.hostname} - port: ${datab.sslport} - file: ${datab.arm}`
            );
            conn = {
                connString:
                    `PROTOCOL=TCPIP;DATABASE=${datab.db};UID=${datab.username};` +
                    `PWD=${datab.password};HOSTNAME=${datab.hostname};Security=SSL;Servicename=${datab.sslport};` +
                    `SSLServerCertificate=${datab.arm};QueryTimeout=60;CHARSET=UTF8;`,
                ibmdb: new Pool({
                    maxPoolSize: 50,
                    connectTimeout: 40,
                    autoCleanIdle: true,
                    idleTimeout: 1200,
                    systemNaming: true,
                }),
            };
        } else {
            utils.logInfo(
                `$db2config (getConn): Using DB2 - db: ${datab.db} - host: ${datab.hostname} - port: ${datab.port}`
            );
            conn = {
                connString:
                    `PROTOCOL=TCPIP;DATABASE=${datab.db};UID=${datab.username};PWD=${datab.password}` +
                    `;HOSTNAME=${datab.hostname};PORT=${datab.port};QueryTimeout=60;CHARSET=UTF8;`,
                ibmdb: new Pool(),
            };
        }

        return conn;
    };
}

export default DB2Config;
