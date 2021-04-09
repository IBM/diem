/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable max-len */

import { addTrace } from '@functions';
import { IConnSchema } from '@models';
import { getConnection } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { IntPythonTransferJob } from '../../np.interfaces';
import { py_truncate, py_jdbc } from './py';

const makeConn: (target: string, connection: IConnSchema) => Promise<string> = async (
    target: string,
    connection: IConnSchema
): Promise<string> => {
    const conn: string = py_jdbc(connection);

    return conn.replace(/\$TARGET/g, target);
};

enum ETarget {
    src_conn = 'src_conn',
    tgt_conn = 'tgt_conn',
}

export const py_transfer: (job: IntPythonTransferJob) => Promise<string> = async (
    job: IntPythonTransferJob
): Promise<string> => {
    let [src_conn, tgt_conn]: [IConnSchema | undefined, IConnSchema | undefined] = [undefined, undefined];

    try {
        [src_conn, tgt_conn] = await Promise.all([
            await getConnection(job.config.source.connection),
            await getConnection(job.config.target.connection),
        ]);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $transfer (pyTransfer)');

        return Promise.reject(err);
    }

    let src: string;
    let tgt: any;
    let batch_size: number;
    let fetch_size: number;
    let truncate: string;

    try {
        src = await makeConn(ETarget.src_conn, src_conn);
        tgt = await makeConn(ETarget.tgt_conn, tgt_conn);
        fetch_size = job.config.source.fetchsize || 5000;
        batch_size = job.config.target.batchsize || 5000;
        truncate = py_truncate(job.config.target.truncate, job.config.target.target, tgt_conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $transfer (pyTransfer)');

        return Promise.reject(err);
    }

    const isolationlevel: string = src_conn.type === 'db2' ? 'src_conn.setTransactionIsolation(1)' : '';

    return `

### py_transfer ###

import jpype
import jpype.imports

if not jpype.isJVMStarted():
  jpype.startJVM(jpype.getDefaultJVMPath())

import java.sql.DriverManager as dm
import java.util.Properties as properties
import java.sql.ResultSet as ResultSet

${src}
src_conn.setReadOnly(True)
${isolationlevel}
${tgt}

msg = f"Job connected at {UtcNow()} - runtime: {time.time() - config.__starttime} - starting with fetch: ${fetch_size} and batch: ${batch_size}"
out(msg)

${truncate}

sql = f"""${job.config.source.sql}"""

# create a statement object
src_stmt = src_conn.createStatement(ResultSet.TYPE_FORWARD_ONLY,
      ResultSet.CONCUR_READ_ONLY)
src_stmt.setFetchSize(${fetch_size})

# create a resultset object
resultSet = src_stmt.executeQuery(sql)
resultSet.setFetchSize(${fetch_size})

# must be before we run the query
rsmd = resultSet.getMetaData()
cc =rsmd.getColumnCount()

# alter_stmt = tgt_conn.prepareStatement("alter table STAGING.DIM_OFFERG_SST activate not logged initially")
# alter_stmt.executeUpdate();

join = ','.join(['?' for s in range(cc)])
cols = ','.join([str(rsmd.getColumnLabel(i+1)) for i in range(cc)])
INSERT_STATEMENT = f"""INSERT INTO ${job.config.target.target} ({cols}) VALUES({join})"""

tgt_conn.setAutoCommit(False)
insert_stmt = tgt_conn.prepareStatement(INSERT_STATEMENT)

loop = 0
c = 1
config.__count = 0
def insert(resultSet):
    global c
    global loop
    try:
      for i in range(cc):
        # rs = resultSet.getObject(i+1)
        insert_stmt.setObject(i + 1, resultSet.getObject(i+1));
      insert_stmt.addBatch();
      if c == ${batch_size}:
          insert_stmt.executeBatch()
          c = 0
          loop += 1
          tgt_conn.commit()
      c += 1
    except Exception as e:
      error(e)


try:
  while resultSet.next():
    config.__count += 1
    insert(resultSet)
  insert_stmt.executeBatch()
  tgt_conn.commit()
  if insert_stmt:
    insert_stmt.close()
  if resultSet:
     resultSet.close()

except Exception as e:
  tgt_conn.close()
  src_conn.close()
  error(e)

tgt_conn.close()
src_conn.close()

data = {
    "jobend": UtcNow(),
    "status": "Completed",
    "count": config.__count,
    "out": f"Job finished at {UtcNow()} - runtime: {time.time() - config.__starttime} - records: {config.__count} - loops {loop}"
}
mq(data)
exit(0)

######
`;
};
