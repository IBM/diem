import { IETLJob } from '@models';

// ideal is to make this an env variable as it's the same path as spark in spark operator uses
const filepath: string = '/tmp/spark-local-dir';

export const py_start: (job: IETLJob) => string = (job: IETLJob): string => String.raw`
### py_start ###

import os
import diemlib.config as config
from diemlib.main import *

env = os.environ

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
config.__nats = True

os.remove(f"{config.__id}.py")

def diem_except_hook(exctype, value, traceback):
    error(value)
sys.excepthook = diem_except_hook

data = {
    "jobstart": config.__jobstart,
    "status": "Running",
    "out": f"Job {config.__id} started - email: {config.__email} - time: {UtcNow()}",
}
mq(data)

startTimer()

######`;
