import { IJobSchema } from '@models';
import { IntPythonRestJob } from '../../np.interfaces';

const py_rest: (doc: IJobSchema) => string = (doc: IJobSchema): string => {
    if (!doc.url) {
        const err: any = {
            message: `No config file found - job: ${doc._id}`,
            trace: ['@at $handle.nodepy.transfer (py_rest)'],
        };

        return err;
    }

    const url: IntPythonRestJob['url'] = doc.url;

    return String.raw`
### py_rest ###

urltype = '${url.type}'

if urltype == 'post':

    try:
        out = requests.post(url='${url.url}', json=${url.body}, headers=${url.headers || '{}'})
        if out.ok:
            try:
                j = out.json()
                t = json.dumps(j)
                mq({
                    "out": t,
                    "jobend": UtcNow(),
                    "status": "Completed"
                })
            except Exception as e:
                error(e)
                raise
        else:
            try:
                j = out.json()
                t = json.dumps(j)
                mq({
                    "out": t,
                    "jobend": UtcNow(),
                    "status": "Failed"
                })
            except Exception as e:
                error(e)
                raise

    except Exception as e:
        error(e)
        raise

else:

    try:
        out = requests.get(url='${url.url}', headers=${url.headers || '{}'})
        if out.ok:
            try:
                j = out.json()
                t = json.dumps(j)
                mq({
                    "out": t,
                    "jobend": UtcNow(),
                    "status": "Completed"
                })
            except Exception as e:
                error(e)
                raise
        else:
            try:
                j = out.json()
                t = json.dumps(j)
                mq({
                    "out": t,
                    "jobend": UtcNow(),
                    "status": "Failed"
                })
            except Exception as e:
                error(e)
                raise
    except Exception as e:
        error(e)
        raise

###__CODE__###`;
};

export const handleNodePyRestJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    const rest: string = py_rest(doc);

    return Promise.resolve(`${code} \n${rest}`);
};
