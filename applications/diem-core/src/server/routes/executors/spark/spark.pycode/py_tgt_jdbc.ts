import { jdbc_config } from '../spark.job.handlers/hendle.spark.common';
import { ITgt } from '../spark.interfaces';

export const py_tgt_jdbc: (tgt: ITgt) => string = (tgt: ITgt) => String.raw`

### py_tgt_jdbc (py_tgt_jdbc) ###

try:
    df_tgt\
        .write\
        .format("jdbc")\
        .mode("${tgt.truncate ? 'overwrite' : 'append'}")\
        .option('driver', '${jdbc_config(tgt.type).driver}')\
        .option("url", "${tgt.jdbc}")\
        .option("user", "${tgt.user}")\
        .option("password", "${tgt.password}")\
        .option("dbtable", "${tgt.target}")\
        .option("isolationLevel", "NONE")\
        .option("batchsize", ${tgt.batchsize || 25000})\
        .option("truncate", ${tgt.truncate ? 'True' : 'False'})\
        .save()

    msg = f"--- job {config.__id} finished inserting at {UtcNow()} --- running time: {time.time() - config.__starttime} ---"
    print(msg)

    config.__count = df_tgt.count()

    data = {
        "jobend": UtcNow(),
        "status": "Completed",
        "out": msg,
        "count": config.__count
    }
    mq(data)

except Exception as e:
    error(e)

###__CODE__###`;
