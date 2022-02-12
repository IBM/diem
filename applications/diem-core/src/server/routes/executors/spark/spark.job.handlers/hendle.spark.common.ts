import { ConnModel, IConnSchema } from '@models';

// not used : traceDirectory=/opt/spark/;traceLevel=TRACE_DIAGNOSTICS;traceFile=jcctrace.log;

const truncate = 'TRUNCATE TABLE $TARGET';

const jdbc_config_base: any = {
    db2: {
        truncate: 'TRUNCATE TABLE $TARGET IMMEDIATE',
        driver: 'com.ibm.db2.jcc.DB2Driver',
        jdbc: ';retrieveMessagesFromServerOnGetMessage=true;',
        connopt: '',
    },
    postgresql: {
        truncate,
        driver: 'org.postgresql.Driver',
        jdbc: '',
        connopt: '',
    },
    nz: {
        truncate,
        driver: 'org.netezza.Driver',
        jdbc: '',
        connopt: '',
    },
    mysql: {
        truncate,
        driver: 'com.mysql.jdbc.Driver',
        jdbc: '',
        connopt: '',
    },
};

export const jdbc_config: (type: string) => any = (type: string) => {
    if (jdbc_config_base[type]) {
        return jdbc_config_base[type];
    } else {
        return {
            truncate,
            driver: '',
            jdbc: '',
            connopt: '',
        };
    }
};

/**
 *
 *
 * @param {string} id
 * @returns {(Promise<IConnModel | Error>)}
 * @error {message, connection, trace[]}
 */
export const getConnection: (org: string, id: string) => Promise<IConnSchema> = async (org: string, id: string): Promise<IConnSchema> => {
    const doc: IConnSchema | null = await ConnModel.findOne({ 'project.org': org, alias: id }).lean().exec();

    if (doc) {
        return Promise.resolve(doc);
    }

    return Promise.reject({
        message: `Error: no connection found for connection with alias: ${id}`,
        connection: id,
        trace: ['@at $spark.common (getConnection)'],
    });
};
