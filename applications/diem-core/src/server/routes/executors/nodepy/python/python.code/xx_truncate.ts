import { IConnSchema } from '../../../../models/models';
import { jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';

export const py_truncate: (truncate: boolean, target: string, connection: IConnSchema) => string = (
    truncate: boolean,
    target: string,
    connection: IConnSchema
): string => {
    const truncate_sql: string = jdbc_config[connection.type].truncate.replace(/\$TARGET/g, target);

    if (!truncate) {
        return String.raw`
### py_truncate ###

tgt_curs = tgt_conn.cursor()

######
`;
    }

    return `

### py_truncate ###

try:
    tgt_curs = tgt_conn.cursor()
    tgt_curs.execute("""${truncate_sql}""")
    tgt_conn.commit()
except Exception as e:
    error(e)
    raise
msg = f"Target truncated at {UtcNow()} - runtime: {time.time() - config.__starttime}"
out(msg)

######
`;
};
