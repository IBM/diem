/* eslint-disable max-len */
import { ConnModel, IConnSchema } from '../../../models/models';

// not used : traceDirectory=/opt/spark/;traceLevel=TRACE_DIAGNOSTICS;traceFile=jcctrace.log;

export const jdbc_config: any = {
    db2: {
        truncate: 'TRUNCATE TABLE $TARGET IMMEDIATE',
        driver: 'com.ibm.db2.jcc.DB2Driver',
        jdbc: ';retrieveMessagesFromServerOnGetMessage=true;',
        connopt: '',
    },
    postgresql: {
        truncate: 'TRUNCATE TABLE $TARGET',
        driver: 'org.postgresql.Driver',
        jdbc: '',
        connopt: '',
    },
    nz: {
        truncate: 'TRUNCATE TABLE $TARGET',
        driver: 'org.netezza.Driver',
        jdbc: '',
        connopt: '',
    },
};

/**
 *
 *
 * @param {string} id
 * @returns {(Promise<IConnModel | Error>)}
 * @error {message, connection, trace[]}
 */
export const getConnection: (id: string) => Promise<IConnSchema> = async (id: string): Promise<IConnSchema> => {
    const doc: IConnSchema | null = await ConnModel.findOne({ alias: id }).lean().exec();

    if (doc) {
        return Promise.resolve(doc);
    }

    return Promise.reject({
        message: `Error: no connection found for connection with alias: ${id}`,
        connection: id,
        trace: ['@at $spark.common (getConnection)'],
    });
};
