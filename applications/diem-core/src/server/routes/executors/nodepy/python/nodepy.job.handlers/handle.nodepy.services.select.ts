import { IConnSchema, IJobSchema } from '@models';
import { addTrace } from '@functions';
import { getConnection, jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';

export const py_select_services: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    if (!doc.stmt) {
        return Promise.reject({
            id: doc._id,
            message: 'job without statement',
        });
    }
    const conn: string = doc.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleSelect)');

        return Promise.reject(err);
    }

    const driver: string = jdbc_config(connection.type).driver;
    const jdbc: string = `${connection.jdbc}${jdbc_config(connection.type).jdbc}`.replace(';;', ';');

    return `
### handle.nodepy.services.select (py_select) ###

import requests
from sys import exit
import jaydebeapi
import pandas as pd

def main():

    conn = jaydebeapi.connect(jclassname="${driver}",
            url='${jdbc}',
            driver_args=['${connection.user}', '${connection.password}'])

    sql = f"""${doc.stmt.sql}"""

    try:
        load = pd.read_sql(sql, conn)
        print(load.to_json(orient ='records'))
        conn.close()

    except Exception as e:
        conn.close()
        error(e)
        raise

main()

###__CODE__###
`;
};

export const handleNodePyServicesSelect: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    const pyselect: string = await py_select_services(doc);

    return Promise.resolve(`${code}\n${pyselect}`);
};
