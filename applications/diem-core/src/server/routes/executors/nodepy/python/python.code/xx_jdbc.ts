import { jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';
import { IConnSchema } from '../../../../models/models';

export const py_jdbc: (connection: IConnSchema) => string = (connection: IConnSchema): string => {
    const driver: string = jdbc_config[connection.type].driver;
    const jdbc: string = `${connection.jdbc}${jdbc_config[connection.type].jdbc}`.replace(';;', ';');
    const connopt: string = jdbc_config[connection.type].connopt;

    return String.raw`
### py_jdbc ###

def getconn():
    try:
        c = jaydebeapi.connect(
            jclassname="${driver}",
            url='${jdbc}',
            driver_args=['${connection.user}', '${connection.password}']
            )
        ${connopt}
        return c
    except Exception as e:
        error(e)
        raise
$TARGET_pool = pool.QueuePool(getconn, max_overflow=10, pool_size=5)
$TARGET = $TARGET_pool.connect()

######`;
};
