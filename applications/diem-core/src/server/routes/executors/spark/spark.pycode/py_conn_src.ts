import { jdbc_config } from '../spark.job.handlers/hendle.spark.common';
import { ISrc } from '../spark.interfaces';

export const py_conn_src: (src: ISrc, partition: string) => string = (src: ISrc, partition: string) => String.raw`

### py_conn_src ###

sql = """(${src.sql}) A"""

try:
    df_src = spark\
        .read\
        .format("jdbc")\
        .option('driver', '${jdbc_config(src.type).driver}')\
        .option("url", "${src.jdbc}")\
        .option("user", "${src.user}")\
        .option("password", "${src.password}")\
        .option("fetchsize", ${src.fetchsize || 25000})\
        .option("isolationLevel", "NONE")\
        .option("dbtable", sql)${partition}\
        .load()

except Exception as e:
    error(e)

msg = f"--- job {config.__id} finished loading at {UtcNow()} --- running time: {time.time() - config.__starttime} ---"
print(msg)
out(msg)

######
`;
