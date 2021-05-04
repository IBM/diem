import { IConnSchema } from '@models';
import { jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';

export const py_jdbc: (connection: IConnSchema) => string = (connection: IConnSchema): string => {
    const jdbc: string = `${connection.jdbc}${jdbc_config[connection.type].jdbc}`.replace(';;', ';');
    const connopt: string = jdbc_config[connection.type].connopt;

    return String.raw`
### py_jdbc ###

def getconn():
    try:
        jdbc = '${jdbc}'
        user = '${connection.user}'
        pw = '${connection.password}'
        conn = dm.getConnection(jdbc,user,pw)
        props = properties()
        props.put("ApplicationName", "DIEM");
        props.put("ClientAccountingInformation", config.__id);
        props.put("clientProgramName", config.__org);
        conn.setClientInfo(props)
        ${connopt}
        return conn
    except Exception as e:
        error(e)
        raise
$TARGET = getconn()

######`;
};
