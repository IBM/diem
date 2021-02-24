import { utc } from 'moment';
import { Database, DB2Config, Pool } from './db2.config';
import { utils } from './utils';

interface IDB2Error extends Error {
    sql: string;
    bindings?: any[];
    params?: any;
    trace: string[];
}

interface IDB2 {
    db2: Pool;
    connString: string;
    runQuery(sql: any, fields: any, bindings?: any[], log?: string): Promise<any>;
    runSimpleQuery(sql: string, title?: string): Promise<any>;
    runStatement(sql: string, params?: undefined | any | null, log?: string): Promise<any>;
    fillArray(value: string, len: number): any[];
    fillArray(value: string, len: number): any[];
    parseData(body: any, fldsIn: any[], fldsOut: any[]): any;
    normalizeDate(param: string | undefined): string;
    _cu(i: string): string;
    _cl(i: string): string;
}

class DB2Functions implements IDB2 {
    public db2: Pool;
    public connString: string;
    private internalMsg = 'Internal Error Happened';
    private counter: number;

    public constructor(db: string) {
        const db2config: DB2Config = new DB2Config(db);
        this.connString = db2config.conn.connString;
        this.db2 = db2config.conn.ibmdb;
        this.counter = 0;
    }

    public runQuery: IDB2['runQuery'] = async (
        sqlIn: string,
        fields: any,
        bindings?: any[],
        title: string = 'no title'
    ): Promise<any> =>
        new Promise((resolve, reject) => {
            const sql: string = sqlIn.replace(/\n/gm, '');

            this.db2.open(this.connString, (err: any, conn: Database) => {
                if (err) {
                    conn.close(() => {
                        /** */
                    });

                    return reject({
                        ...err,
                        bindings,
                        sql,
                        title,
                        trace: [`@at $db2.functions (runquery) - ${utils.time()}`],
                    });
                }

                if (!conn.connected) {
                    utils.logInfo(`$db2.functions (runQuery): rejecting ${title}`);

                    return reject({
                        bindings,
                        message: 'could not connect',
                        sql,
                        title,
                        trace: [`@at $db2.functions (runquery-1) - ${utils.time()}`],
                    });
                }

                this.counter = this.counter + 1;
                utils.logInfo(`$db2.functions (runQuery): starting ${title} - sqlc: ${this.counter}`);

                conn.query(sql, bindings)
                    .then((data: any) => {
                        conn.close();
                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.functions (runQuery): completed ${title} - sqlc: ${this.counter}`);
                        this.db2.close(() => {
                            /*closed*/
                        });
                        resolve(this.final(fields, data));
                    })
                    .catch((error: IDB2Error): void => {
                        conn.close();
                        this.db2.close(() => {
                            /*closed*/
                        });
                        this.counter = this.counter - 1;

                        if (error.message && error.message.includes('SQL30081N')) {
                            return process.exit(1);
                        }

                        return reject({
                            ...error,
                            bindings,
                            sql,
                            title,
                            trace: [`@at $db2.functions (runquery-1) - ${utils.time()}`],
                        });
                    });
            });
        });

    public runStatement: IDB2['runStatement'] = async (
        sqlIn: string,
        params?: any,
        title: string = 'no title'
    ): Promise<any> =>
        new Promise((resolve, reject) => {
            const sql: string = sqlIn.replace(/\n/gm, '');

            this.db2.open(this.connString, (err: Error, conn: any) => {
                if (err) {
                    conn.close(() => {
                        utils.logInfo(`$db2.functions (runStatement) : closing pool - ${title}`);
                    });

                    this.db2.close(() => {
                        /*closed*/
                    });

                    return reject({
                        ...err,
                        params,
                        sql,
                        title,
                        trace: [`@at $db2.functions (runStatement-1) - ${utils.time()}`],
                    });
                }

                if (!conn.connected) {
                    utils.logInfo(`$db2.functions (Query): rejecting ${title} - pi: ${title}`);

                    return reject({
                        message: 'could not connect',
                        params,
                        sql,
                        title,
                        trace: [`@at $db2.functions (runStatement-1) - ${utils.time()}`],
                    });
                }

                conn.prepare(sql, (error: Error, stmt: any) => {
                    if (error) {
                        conn.closeSync();

                        this.db2.close(() => {
                            /*closed*/
                        });

                        return reject({
                            ...error,
                            params,
                            sql,
                            title,
                            trace: [`@at $db2.functions (prepare) - ${utils.time()}`],
                        });
                    }
                    this.counter = this.counter + 1;
                    utils.logInfo(`$db2.functions (Statement): starting ${title} - sqlc: ${this.counter}`);
                    stmt.execute(params, (preperror: IDB2Error, result: any) => {
                        if (preperror) {
                            conn.closeSync();

                            this.db2.close(() => {
                                /*closed*/
                            });

                            this.counter = this.counter - 1;

                            preperror.sql = sql;
                            preperror.params = params;

                            return reject({
                                ...preperror,
                                params,
                                sql,
                                title,
                                trace: [`@at $db2.functions (runStatement-2) - ${utils.time()}`],
                            });
                        } else {
                            result.closeSync();
                        }

                        stmt.closeSync();
                        conn.closeSync();

                        this.db2.close(() => {
                            /*closed*/
                        });

                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.functions (Statement): completed ${title} - sqlc: ${this.counter}`);

                        resolve(true);
                    });
                });
            });
        });

    public runSimpleQuery: IDB2['runSimpleQuery'] = async (sqlIn: string, title: string = 'no name'): Promise<any> =>
        new Promise((resolve, reject) => {
            const sql: string = sqlIn.replace(/\n/gm, '');

            this.db2.open(this.connString, (err: any, conn: any) => {
                if (err) {
                    conn.close(() => {
                        utils.logInfo('$db2.functions (connection) : closing pool');
                    });

                    this.db2.close(() => {
                        /*closed*/
                    });

                    return reject({
                        ...err,
                        error: true,
                        message: this.internalMsg,
                        title,
                        trace: [`@at $db2.functions (runSimpleQuery-1) - ${utils.time()}`],
                    });
                }

                if (!conn.connected) {
                    utils.logInfo(`$db2.functions (Query): rejecting ${title}`);

                    conn.closeSync();

                    this.db2.close(() => {
                        /*closed*/
                    });

                    return reject({
                        error: true,
                        message: this.internalMsg,
                        title,
                        trace: [`@at $db2.functions (runSimpleQuery-1) - ${utils.time()}`],
                    });
                }

                this.counter = this.counter + 1;
                utils.logInfo(`$db2.functions (runSimpleQuery): starting ${title} - sqlc: ${this.counter}`);

                conn.query(sql)
                    .then((data: any) => {
                        conn.close();
                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.functions (runSimpleQuery): completing ${title} - sqlc: ${this.counter}`);
                        resolve(data);
                    })
                    .catch((error: IDB2Error): void => {
                        conn.close();
                        this.db2.close(() => {
                            /*closed*/
                        });
                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.functions (runSimpleQuery): error ${title} - open sql :  ${this.counter}`);

                        reject({
                            ...error,
                            sql,
                            title,
                            trace: [`@at $db2.functions (runSimpleQuery-2) - ${utils.time()}`],
                        });
                    });
            });
        });

    public fillArray = (value: string, len: number): any[] => {
        const arr: any[] = [];
        for (let i: number = 0; i < len; i++) {
            arr.push(value);
        }

        return arr;
    };

    public _cu = (i: string): string => i.toUpperCase();

    public _cl = (i: string): string => i.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public parseData = (body: any, fldsIn: any[], fldsOut: any[]): any => {
        const fields: any[] = []; // list of fields to insert
        const values: any[] = []; // list of values to insert
        const maps: any = {};

        fldsIn.forEach((fld: string, idx: number) => {
            const flIn: string = fld.toLowerCase(); /*  ID becomes id to check with req.body */
            const flOut: string = fldsOut[idx].toLowerCase(); /*  ID becomes id to check with req.body */

            if (Object.keys(body).includes(flIn)) {
                fields.push(flOut);
                values.push(body[flIn]);
                maps[flOut] = body[flIn];
            }
        });

        return {
            fields: fields.join(','),
            id: body.id,
            inserts: this.fillArray('?', fields.length).join(','), // ? multiplied by elements sting ?,?,?
            maps,
            values,
        };
    };

    public normalizeDate = (param?: string): string => {
        if (param) {
            return utc(param).format('YYYY-MM-DD HH:mm:ss');
        }

        return utc(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss');
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    private final = (fields: any, data: any[] = []): any[] =>
        data.map((item: any) => {
            const obj: { [index: string]: any } = {};
            fields.forEach((m: any) => {
                // eslint-disable-next-line no-underscore-dangle
                const fld: any = this._cu(m);

                // eslint-disable-next-line no-underscore-dangle
                obj[this._cl(fld)] = fld.startsWith('M_') ? JSON.parse(item[fld]) : item[fld];
            });

            return obj;
        });
}

export default DB2Functions;
