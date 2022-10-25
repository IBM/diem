import { IConnSchema } from '@models';
import { addTrace } from '@functions';
import { IntPythonStmtJob } from '../../np.interfaces';
import { getConnection } from '../../../spark/spark.job.handlers/handle.spark.common';
import { py_jdbc } from './py_jdbc';

const makeConn: (target: string, connection: IConnSchema) => Promise<string> = async (
    target: string,
    connection: IConnSchema
): Promise<string> => {
    const conn: string = py_jdbc(connection);

    return conn.replace(/\$TARGET/g, target);
};

export const py_stmt_services: (job: IntPythonStmtJob) => Promise<string> = async (
    job: IntPythonStmtJob
): Promise<string> => {
    const conn: string = job.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(job.org, conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleStmt)');

        return Promise.reject(err);
    }

    const tgt_conn: string = await makeConn('tgt_conn', connection);

    return `
### handle.nodepy.stmt (py_stmt) ###

import jpype
import jpype.imports

if not jpype.isJVMStarted():
  jpype.startJVM(jpype.getDefaultJVMPath())

import java.sql.DriverManager as dm
import java.util.Properties as properties

${tgt_conn}
tgt_conn.setAutoCommit(False)

sqls = [x.strip() for x in """${job.stmt.sql}""".split(';')]

while("" in sqls):
    sqls.remove("")

i = 0
for sql in sqls:

    try:
        st_time = time.time()
        tgt_stmt = tgt_conn.createStatement()
        tgt_stmt.executeUpdate(f"""{sql}""")
        tgt_conn.commit()
        i += 1
        msg = "Completed Sequence {0}".format(i)
        printl(msg)

    except Exception as e:
        error(e)
        raise

tgt_stmt.close()
tgt_conn.close()

###__CODE__###`;
};

export const handleNodePyServicesStmtJob: (code: string, job: IntPythonStmtJob) => Promise<string> = async (
    code: string,
    job: IntPythonStmtJob
): Promise<string> => {
    const pystmt: string = await py_stmt_services(job);

    return Promise.resolve(`${code}\n${pystmt}`);
};
