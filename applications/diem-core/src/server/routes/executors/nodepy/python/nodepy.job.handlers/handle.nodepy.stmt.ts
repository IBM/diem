import { IJobSchema, IConnSchema, ITemplatesModel } from '@models';
import { addTrace } from '@functions';
import { getConnection } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { lookupTemplate } from '../../../../job.front/job.template';
import { py_jdbc } from './py_jdbc';

const makeConn: (target: string, connection: IConnSchema) => Promise<string> = async (
    target: string,
    connection: IConnSchema
): Promise<string> => {
    const conn: string = py_jdbc(connection);

    return conn.replace('$TARGET', target);
};

const py_stmt: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    if (!doc.stmt) {
        const err: any = {
            message: `No statement found - job: ${doc._id.toString()}`,
            trace: ['@at $handle.nodepy.transfer (handleConfig)'],
        };

        return Promise.reject(err);
    }

    const conn: string = doc.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleStmt)');

        return Promise.reject(err);
    }

    const tgt_conn: string = await makeConn('tgt_conn', connection);

    let sql: string = doc.stmt.sql;

    if (doc.templateid) {
        const templ: ITemplatesModel | null = await lookupTemplate(doc.templateid);

        if (templ?.template) {
            sql = templ.template;
        }
    }

    sql = sql
        .split(';')
        .map((item) => item.trim())
        .join(';');

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

sqls = [x.strip() for x in """${sql}""".split(';')]

while("" in sqls):
    sqls.remove("")

i = 0

sq = len(sqls)

msg = f"Starting {sq} Sequences"
mq({"out": msg})

for sql in sqls:

    try:
        st_time = time.time()
        fw = sql.split()[0]
        if fw.upper() in ['CALL']:
            tgt_stmt = tgt_conn.prepareStatement(f"""{sql}""")
            tgt_stmt.execute()
        else:
            tgt_stmt = tgt_conn.createStatement()
            tgt_stmt.executeUpdate(f"""{sql}""")
        tgt_conn.commit()
        i += 1
        msg = f"Completed Sequence {i} - Runtime: {round(time.time() - st_time,2)} - Affected rows: {tgt_stmt.getUpdateCount()}"
        data = {
            "out": msg
        }
        mq(data)

    except Exception as e:
        error(e)
        raise

tgt_stmt.close()
tgt_conn.close()

data = {
    "jobend": UtcNow(),
    "status": "Completed",
    "out": f"Finished {sq} Sequences - Total Runtime: {round(time.time() - config.__starttime,2)}",
    "count": config.__count
    }
mq(data)
exit(0)

###__CODE__###`;
};

export const handleNodeStmtJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    let pystmt: string = await py_stmt(doc);

    if (pystmt.includes('$$')) {
        pystmt = pystmt.split('$$').join('$$$$');
    }

    return Promise.resolve(code.replace('###__CODE__###', pystmt));
};
