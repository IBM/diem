import { getConnection, jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { IConnSchema } from '../../../../models/models';
import { addTrace } from '../../../../shared/functions';
import { IntPythonStmtJob } from '../../np.interfaces';

export const py_stmt: (job: IntPythonStmtJob) => Promise<string> = async (job: IntPythonStmtJob): Promise<string> => {
    const conn: string = job.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleStmt)');

        return Promise.reject(err);
    }

    const driver: string = jdbc_config[connection.type].driver;
    const jdbc: string = `${connection.jdbc}${jdbc_config[connection.type].jdbc}`.replace(';;', ';');

    let sql: string = job.stmt.sql;

    sql = sql
        .split(';')
        .map((item) => item.trim())
        .join(';');

    return `
### py_stmt ###

import jaydebeapi

tgtconn = jaydebeapi.connect(jclassname="${driver}",
          url='${jdbc}',
          driver_args=['${connection.user}', '${connection.password}'])
tgtconn.jconn.setAutoCommit(False)

curs = tgtconn.cursor()

sqls = [x.strip() for x in """${sql}""".split(';')]

while("" in sqls):
    sqls.remove("")

i = 0

sq = len(sqls)

msg = f"--- Starting {sq} Sequences ---"
mq({"out": msg})

for sql in sqls:

    try:
        st_time = time.time()
        nsql = f"""{sql}"""
        curs.execute(nsql)
        tgtconn.commit()
        i += 1
        msg = f"--- Completed Sequence {i} --- Runtime: {round(time.time() - st_time,2)} --- Affected rows: {curs.rowcount} ---"
        data = {
            "out": msg
        }
        mq(data)

    except Exception as e:
        error(e)
        raise

curs.close()
tgtconn.close()

time.sleep(1)
data = {
    "jobend": UtcNow(),
    "status": "Completed",
    "out": f"--- Finished {sq} Sequences --- Total Runtime: {round(time.time() - config.__starttime,2)} ---",
    "count": config.__count
    }
mq(data)
exit(0)

######`;
};
