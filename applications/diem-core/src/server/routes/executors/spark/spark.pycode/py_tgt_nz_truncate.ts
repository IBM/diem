import { ITgt } from '../spark.interfaces';
// eslint-disable-next-line camelcase
export const py_tgt_nz_truncate: (tgt: ITgt) => string = (tgt: ITgt) =>
    String.raw`
### py_tgt_nz_truncate ###

try:
    sql = "TRUNCATE TABLE ${tgt.target}"
    curs.execute(sql)
    tgtconn.commit()
    mq({"out": "${tgt.target} truncated"})
    msg = f"--- job {config.__id} truncated table ${tgt.target} {UtcNow()} ---"
    print(msg)
except Exception as e:
    error(e)

######`;
