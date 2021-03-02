import { sparkCredentials } from '../../../../spark-operator/spark.base';
import { IETLJob } from '../../../../models/models';

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath: string = '/tmp/spark-local-dir';

export const py_start_services: (job: IETLJob) => string = (job: IETLJob): string => {
    const callback_url: string = sparkCredentials.callback_url;

    return String.raw`### py_start ###

import time
import os
import diemlib.config as config
from diemlib.main import *

env = os.environ

config.__url = '${callback_url.replace('spark', 'services')}'
config.__id = '${job.id}'
config.__email = '${job.email}'
config.__jobid = '${job.jobid}'
config.__name = '${job.name}'
config.__filepath = '${filepath}'
config.__transid = '${job.transid}'
config.__org = '${job.org}'
config.__count = 0
config.__starttime = time.time()
config.__jobstart = UtcNow()

######`;
};
