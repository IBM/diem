import { ITgt } from '../spark.interfaces';
import { py_tgt_nz_truncate } from './py_tgt_nz_truncate';

export const py_tgt_nz: (tgt: ITgt) => string = (tgt: ITgt) =>
    String.raw`

### py_tgt_nz ###

from pyspark.sql.functions import regexp_replace, col
import jaydebeapi
import glob

cols = df_tgt.columns  # list of all columns

__logdir = f"{config.__filepath}/{config.__id}/"  # the working directory

for col_name in cols:

    df_tgt = df_tgt.withColumn(col_name, regexp_replace(
        col(col_name), "[\\r\\n\\\\\x00-\x1f\x7f-\x9f]", " "))

try:
    df_tgt.coalesce(1) \
        .write\
        .mode("${tgt.truncate ? 'overwrite' : 'append'}")\
        .option("inferSchema", "true")\
        .option("sep", "|")\
        .option("emptyValue", " ")\
        .option("escapeQuotes", True)\
        .option("escape", "\\")\
        .option("multiLine", False)\
        .option("header", "true")\
        .option("quote", "\"")\
        .option("timestampFormat", "yyyy-MM-dd hh:mm:ss.SSSSSS")\
        .csv(__logdir)
except Exception as e:
    error(e)

print(f"--- job {config.__id} written to {__logdir} at {UtcNow()} ---")

tgtconn = jaydebeapi.connect(
"org.netezza.Driver",
'${tgt.jdbc};AutoCommit=false;logdirPath=' + __logdir + ';',
['${tgt.user}', '${tgt.password}'], '/opt/spark/jars/nzjdbc3.jar')

mq({"out": "Connected to source"})

print(f"--- connected to ${tgt.jdbc} --- at {UtcNow()} ")

curs = tgtconn.cursor()

${tgt.truncate ? py_tgt_nz_truncate(tgt) : ''}

path = __logdir + '*.csv'

for fname in glob.glob(path):

    curs = tgtconn.cursor()

    mq({"out": "Inserting: " + fname})

    print(fname)

    try:
        sql = f"""
            INSERT INTO ${tgt.target}
            SELECT * FROM EXTERNAL '{fname}'
            USING (delimiter '|'
                REMOTESOURCE 'JDBC'
                ESCAPECHAR '\\'
                SkipRows 1
                __logdir '{__logdir}'
                SkipRows 1
                MAXERRORS 1
                Y2BASE 2000
                QuotedValue 'DOUBLE'
                )
            """
        curs.execute(sql)
        tgtconn.commit()

    except Exception as e:

        try:
            os.chdir(__logdir)
            for file in glob.glob("*.nzlog"):
                output = open(os.path.join(__logdir, file), "r").read()
                mq({"out": f'<pre>{output} </pre>'})
            for file in glob.glob("*.nzbad"):
                output = open(os.path.join(__logdir, file), "r").read()
                mq({"out": f'<pre>{output} </pre>'})
        except Exception as e:
            error(e)
        error(e)

msg = f"--- job {config.__id} inserted into netezza at {UtcNow()} ---"
print(msg)

data = {
"jobend": UtcNow(),
"status": "Completed",
"count": df_tgt.count(),
"out": msg
}
mq(data)

###__CODE__###`;
