import { IJobSchema } from '@models';
import { IntPythonRestJob } from '../../np.interfaces';

export const py_rest_services: (doc: IJobSchema) => string = (doc: IJobSchema): string => {
    if (!doc.url) {
        return String.raw`
error("No Url")
`;
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

export const handleNodePyServicesRestJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    const rest: string = py_rest_services(doc);

    return Promise.resolve(`${code} \n${rest}`);
};
