export const py_start: () => string = () => String.raw`### py_start (py_start) ###

import os
import sys
import time

import diemlib.config as config
from diemlib.main import *

env = os.environ

config.__id = env.get('ID', None)
config.__email = env.get('EMAIL', None)
config.__jobid = env.get('JOBID', None)
config.__name = env.get('NAME', None)
config.__filepath = env.get('FILEPATH', '/opt/spark/')
config.__transid = env.get('TRANSID', '37e1c542-bb41-4e78-e085-6ad891f46d94')
config.__org = env.get('ORG', None)
config.__starttime = time.time()
config.__jobstart = UtcNow()
config.__url = env.get('SPARK__CALLBACK_URL',None)
config.__nats = False
config.__appname = env.get('APPNAME', 'diem-core')
config.__K8_SYSTEM = env.get('K8_SYSTEM', None)

from pyspark.sql import SparkSession
from pyspark.sql.functions import *

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
# add some time before we start
time.sleep(0.1)
mq(data)

# not used here
# startTimer()

###__CODE__###`;
