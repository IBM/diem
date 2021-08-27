import { IJobSchema, IConnSchema } from '@models';
import { addTrace } from '@functions';
import { getConnection, jdbc_config } from '../../../spark/spark.job.handlers/hendle.spark.common';

const py_select: (doc: IJobSchema) => Promise<string> = async (doc: IJobSchema): Promise<string> => {
    if (!doc.stmt) {
        return Promise.reject({
            id: doc._id,
            message: 'job without statement',
        });
    }
    const conn: string = doc.stmt.connection;

    let connection: IConnSchema;

    try {
        connection = await getConnection(conn);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $stmt (handleSelect)');

        return Promise.reject(err);
    }

    const driver: string = jdbc_config(connection.type).driver;
    const jdbc: string = `${connection.jdbc}${jdbc_config(connection.type).jdbc}`.replace(';;', ';');

    return `
### handle.nodepy.select (py_select) ###

import jaydebeapi
import pandas as pd

conn = jaydebeapi.connect(jclassname="${driver}",
          url='${jdbc}',
          driver_args=['${connection.user}', '${connection.password}'])

sql = f"""${doc.stmt.sql}"""

def getValue(value,*args):

    if not args:
        return None
    else:
        default = args[0]

    if 'values' not in globals():
        return default

    if value in values:
        return values[value]

    return default

try:
    df = pd.read_sql(sql, conn)
    __rows =  getValue('rows',5)
    conn.close()

    if __rows > 100:
        __rows = 100

    results = df.head(__rows)
    results_html = results.to_html()

    if('cos' in globals()):
        filename = f'report-{UtcNow()}.csv' if 'files_filename' not in globals() else files_filename

        savePandas(filename, df)
        cos.saveFile(filename,None)

        msg = f"file {filename} saved in cloud object storage"
        out(msg)


    if('mailhandler' in globals()):

        if not 'mail_to' in globals():
            mail_to = config.__email

        from diemlib.filehandler import savePandas
        from diemlib.mailhandler import mailhandler
        mh = mailhandler()

        attachment_list = []

        if 'mail_filename' in globals():

            savePandas(mail_filename, df)
            attachment_list.append(mail_filename)

        mh.mail(
            sender = config.__email if 'mail_sender' not in globals() else mail_sender,
            to =   config.__email if 'mail_to' not in globals() else mail_to,
            subject = config.__name if 'mail_subject' not in globals() else mail_subject,
            content = results.to_html() if 'mail_content' not in globals() else mail_content.format(**locals()),
            attachments = attachment_list
        )

    data = {
        "out": results_html,
        "status": "Completed",
        "count": config.__count
    }
    mq(data)

except Exception as e:
    error(e)
    raise


###__CODE__###
`;
};

export const handleNodePySelect: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    const pyselect: string = await py_select(doc);

    return Promise.resolve(`${code}\n${pyselect}`);
};
