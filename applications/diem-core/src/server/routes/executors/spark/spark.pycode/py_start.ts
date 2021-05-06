// eslint-disable-next-line camelcase
export const py_start: () => string = () => String.raw`

### py_start ###

import sys

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
import time
import os
import diemlib.config as config
from diemlib.main import *

env = os.environ

config.__id = env.get('ID', 'noop')
config.__email = env.get('EMAIL', 'noop')
config.__jobid = env.get('JOBID', 'noop')
config.__name = env.get('NAME', 'noop')
config.__filepath = env.get('FILEPATH', '/opt/spark/')
config.__transid = env.get('TRANSID', '37e1c542-bb41-4e78-e085-6ad891f46d94')
config.__org = env.get('ORG', 'noop')
config.__starttime = time.time()
config.__jobstart = UtcNow()
config.__url = env.get('SPARK__CALLBACK_URL','noop')
config.__nats = False

def diem_except_hook(exctype, value, traceback):
    error(value)
sys.excepthook = diem_except_hook

msg = f"--- job {config.__id} started by {config.__email} for org {config.__org} at {UtcNow()}---"
print(msg)

data = {
    "jobstart": UtcNow(),
    "status": "Running",
    "out": msg
}
mq(data)

startTimer()

######
`;
