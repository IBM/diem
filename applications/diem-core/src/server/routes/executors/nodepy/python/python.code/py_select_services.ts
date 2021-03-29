import { getConnection, jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { IConnSchema } from '@models';
import { addTrace } from '../../../../shared/functions';
import { IntPythonStmtJob } from '../../np.interfaces';

export const py_select_services: (job: IntPythonStmtJob) => Promise<string> = async (
    job: IntPythonStmtJob
): Promise<string> => {
    const conn: string = job.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleSelect)');

        return Promise.reject(err);
    }

    const driver: string = jdbc_config[connection.type].driver;
    const jdbc: string = `${connection.jdbc}${jdbc_config[connection.type].jdbc}`.replace(';;', ';');

    return `
### py_select ###

import requests
from sys import exit
import jaydebeapi
import pandas as pd

def main():

    conn = jaydebeapi.connect(jclassname="${driver}",
            url='${jdbc}',
            driver_args=['${connection.user}', '${connection.password}'])

    sql = f"""${job.stmt.sql}"""

    try:
        load = pd.read_sql(sql, conn)
        printl(load.to_json(orient ='records'))
        conn.close()

    except Exception as e:
        conn.close()
        error(e)
        raise

main()

######
`;
};
