import { addTrace } from '@functions';
import { IConnSchema, IJobSchema, ITemplatesModel } from '@models';
import { lookupTemplate } from '../../../../job.front/job.template';
import { getConnection, jdbc_config } from '../../../spark/spark.job.handlers/handle.spark.common';
import { py_jdbc } from './py_jdbc';

const py_truncate: (truncate: boolean, target: string, connection: IConnSchema) => string = (
    truncate: boolean,
    target: string,
    connection: IConnSchema
): string => {
    const truncate_sql: string = jdbc_config(connection.type).truncate.replace(/\$TARGET/g, target);

    if (!truncate) {
        return String.raw`### handle.nodepy.transfer (py_truncate) ###

# No truncation

###__CODE__###
`;
    }

    return `

### handle.nodepy.transfer (py_truncate) ###

try:

    tgt_stmt = tgt_conn.createStatement()
    tgt_stmt.executeUpdate("""${truncate_sql}""")
    tgt_conn.commit()

except Exception as e:
    error(e)
    raise

msg = f"Target truncated at {UtcNow()} - runtime: {time.time() - config.__starttime}"
out(msg)

###__CODE__###
`;
};

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

const py_transfer: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    if (!doc.config) {
        return Promise.reject({
            id: doc._id.toString(),
            message: 'job without config',
        });
    }

    let [src_conn, tgt_conn]: [IConnSchema | undefined, IConnSchema | undefined] = [undefined, undefined];

    try {
        [src_conn, tgt_conn] = await Promise.all([
            await getConnection(doc.project.org, doc.config.source.connection),
            await getConnection(doc.project.org, doc.config.target.connection),
        ]);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $py_transfer (pyTransfer) - get connection');

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
        fetch_size = doc.config.source.fetchsize || 5000;
        batch_size = doc.config.target.batchsize || 5000;
        truncate = py_truncate(doc.config.target.truncate, doc.config.target.target, tgt_conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $py_transfer (pyTransfer) - make connection');

        return Promise.reject(err);
    }

    const isolationlevel: string = src_conn.type === 'db2' ? 'src_conn.setTransactionIsolation(1)' : '';

    let sql: string = doc.config.source.sql;

    if (doc.templateid) {
        const templ: ITemplatesModel | null = await lookupTemplate(doc.templateid);

        if (templ?.template) {
            sql = templ.template;
        }
    }

    return `

### handle.nodepy.transfer (py_transfer) ###

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

tgt_conn.setAutoCommit(False)

msg = f"Job connected at {UtcNow()} - runtime: {time.time() - config.__starttime} - starting with fetch: ${fetch_size} and batch: ${batch_size}"
out(msg)

${truncate}

sql = f"""${sql}"""

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

join = ','.join(['?' for s in range(cc)])
cols = ','.join([str(rsmd.getColumnLabel(i+1)) for i in range(cc)])
INSERT_STATEMENT = f"""INSERT INTO ${doc.config.target.target} ({cols}) VALUES({join})"""

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
          try:
            insert_stmt.executeBatch()
          except Exception as e:
            if 'getNextException' in dir(e):
              error(e.getNextException())
            else:
              error(e)
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

  try:
    insert_stmt.executeBatch()
  except Exception as e:
    if 'getNextException' in dir(e):
      error(e.getNextException())
    else:
      error(e)

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

###__CODE__###
`;
};

/**
 *
 * @input job
 * @returns {(Promise<INodePyJob>)}
 * @error {message, connection, trace[]}
 */
export const handleNodePyTransferJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    let pytransfer: string;

    try {
        pytransfer = await py_transfer(doc);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle_nodepy.transfer (handleNodePyTransferJob)');

        return Promise.reject(err);
    }

    return Promise.resolve(`${code}\n${pytransfer}`);
};
