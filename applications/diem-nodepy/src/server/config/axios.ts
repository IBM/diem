import axios, { AxiosResponse } from 'axios';
import { utils } from '@common/utils';
import { IntJob } from './interfaces';

export const postJob: (job: IntJob) => Promise<any> = async (job: IntJob): Promise<any> => {
    const url: string = 'http://etl-mgr/internal/spark_callback';

    try {
        const resp: AxiosResponse = await axios.post(`${url}`, job);

        if (resp.data) {
            utils.logInfo(`axios (postJob):: completed callback - job: ${job.id} - name: ${job.name}`, job.transid);
        }
    } catch (err) {
        if (err.response || err.request) {
            void utils.logError(`axios (postJob): post error - job: ${job.id} - name: ${job.name}`);
        }
    }

    return Promise.resolve();
};
