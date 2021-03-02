/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable max-len */

import { addTrace } from '../../../../shared/functions';
import { getConnection } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { IConnSchema } from '../../../../models/models';
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
    let fetch_size: number;
    let truncate: string;

    try {
        src = await makeConn(ETarget.src_conn, src_conn);
        tgt = await makeConn(ETarget.tgt_conn, tgt_conn);
        fetch_size = job.config.source.fetchsize || 5000;
        truncate = py_truncate(job.config.target.truncate, job.config.target.target, tgt_conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $transfer (pyTransfer)');

        return Promise.reject(err);
    }

    return `

### py_transfer ###

import pandas as pd
import sqlalchemy.pool as pool
import jaydebeapi

${src}
msg = f"Connected to source at {UtcNow()} - runtime: {time.time() - config.__starttime}"
out(msg)
${tgt}
msg = f"Connected to target at {UtcNow()} - runtime: {time.time() - config.__starttime}"
out(msg)

${truncate}

sql = f"""${job.config.source.sql}"""

index = 0

def process_frame(batch):
    num_columns = len(batch.axes[1])
    join = ','.join(['?' for s in range(num_columns)])
    sql = f"""INSERT INTO ${job.config.target.target} VALUES({join})"""

    data = []
    for x in batch.values:
      t= []
      for y in x:
        if(type(y).__name__ == 'int64'):
          t.append(int(y))
        else:
          t.append(y)
      data.append(tuple(t))
    tgt_curs.executemany(sql, tuple(data))
    tgt_conn.commit()

try:

    for index, batch in enumerate(pd.read_sql(sql, src_conn, chunksize=${fetch_size}), start=1):
        config.__count += len(batch.index)
        process_frame(batch)
    tgt_curs.close()
    tgt_conn.close()

except Exception as e:
    tgt_curs.close()
    tgt_conn.close()
    err = str(e)
    if "result set is closed" in err:
        msg = f"Job {config.__id} bypass db2 resultset error at {UtcNow()} - runtime: {time.time() - config.__starttime}"
        print(msg)
    else:
        error(e)
        raise

msg = f"Job {config.__id} finished at {UtcNow()} - runtime: {time.time() - config.__starttime} - loops: {index} - records: {config.__count} - fetch: ${fetch_size}"
out(msg)

time.sleep(1)
data = {
    "jobend": UtcNow(),
    "status": "Completed",
    "count": config.__count
}
mq(data)
exit(0)

######
`;
};
