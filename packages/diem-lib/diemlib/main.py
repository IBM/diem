#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/main.py

"""
   This this the meain module
   It contains generic functions that can be used within the jobs
"""

import time
import json
import datetime
import sys
from sys import exit
import traceback
import diemlib.config as config
import requests
import io

__all__ = ["UtcNow", "runTime", "printl",
           "mq", "out", "endJob", "endjob", "failjob", "stopjob", "error", "startTimer"]


def UtcNow():
    # Returns the current timestamp in UTC Format
    now = datetime.datetime.utcnow()
    return now.strftime("%Y-%m-%dT%H:%M:%S") + "Z"


def runTime():
    # Returns the elapsed time between function call
    # and the start time
    return time.time() - config.__starttime


def printl(msg):
    mq({"out": msg})


def mq(data):

    # Returns job data back to the main application
    data["id"] = config.__id
    data["jobid"] = config.__jobid
    data["transid"] = config.__transid
    data["serviceid"] = config.__serviceid
    data["email"] = config.__email
    data["name"] = config.__name
    try:
        if "out" in data:
            res = data.get("out")
            if isinstance(res, (dict)):
                try:
                    data["out"] = json.dumps(res, separators=(",", ":"))
                except Exception:
                    data["out"] = "Response Json could not be parsed"
            elif not isinstance(res, (int, float, str, bool)):
                try:
                    data["out"] = str(res)
                except Exception:
                    data["out"] = "Response must be booleam, number, string or json"
    except Exception as e:
        error(e)

    if config.__logcount > config.__loglimit:
        # set the logcount back to 0 so that the error can pass
        config.__logcount = 0
        error(f"Rate limit of {config.__loglimit} exceeded")

    config.__logcount += 1

    if config.__nats is False:
        t = json.dumps(data)
        if len(t) > 1024000:
            data["out"] = "maximum payload of 1 MB exceeded"

        requests.post(url=config.__url, data=data)
    else:
        print(json.dumps(data))


def out(data):
    # Shortcut for returning data to the main application
    mq({"out": data})


def endJob(kwargs):
    # Ends the Job

    if config.__timer:
        config.__timer.cancel()
        config.__time = None

    try:
        Completed = "Completed"
        Failed = "Failed"
        Stopped = "Stopped"
        failMsg1 = "Missing Status Keyword"
        failMsg2 = "Status Field Should be of String Data Type"
        failMsg3 = "Status Field Not set Properly. Allowed are (Completed,Failed,Stopped)"
        failMsg4 = "Out Field Should be of either a String or Object Type"
        failMsg5 = "Count Field Should be of String Data Type"

        coreEndStatus = [Completed, Failed, Stopped]

        failMessage = []
        data = {}

        if len(kwargs) == 0:
            failMessage.append(failMsg1)

        for key, value in kwargs.items():
            if key == "status" and not isinstance(value, str):
                failMessage.append(failMsg2)
                continue
            if key == "status" and value not in coreEndStatus:
                failMessage.append(failMsg3)
                continue
            if key == "out" and not isinstance(value, (str, dict)):
                failMessage.append(failMsg4)
                continue
            if key == "count" and not isinstance(value, int):
                failMessage.append(failMsg5)
                continue
            data[key] = value

        if len(failMessage) > 0:
            data["status"] = Failed
            data["out"] = ". ".join(str(msg) for msg in failMessage)

        data["jobend"] = UtcNow()

        mq(data)

        exit()

    except Exception as e:
        data = {"status": Failed, "out": e}
        error(e)


def endjob(out=None):
    data = {"status": "Completed", "count": config.__count}
    if not out == None:
        data["out"] = out
    endJob(data)


def stopjob(out=None):
    data = {"status": "Stopped", "count": config.__count}
    if not out == None:
        data["out"] = out
    endJob(data)


def failjob(out=None):
    data = {"status": "Failed", "count": config.__count}
    if not out == None:
        data["out"] = out
    endJob(data)


def error(err):

    if config.__timer:
        config.__timer.cancel()
        config.__time = None

    etype, value, tb = sys.exc_info()
    if not tb is None:
        extract = traceback.extract_tb(tb)[0]
        msg = f"Error: {str(err)} - line: {extract[1]} - type: {type(err).__name__} - stack: {extract[3]}"
    else:
        msg = f"Error: {str(err)} - type: {type(err).__name__}"

    if config.__isservice:
        print(msg)
    else:
        data = {
            "email": config.__email,
            "error": msg,
            "id": config.__id,
            "jobid": config.__jobid,
            "serviceid": config.__serviceid,
            "jobend": UtcNow(),
            "name": config.__name,
            "status": "Failed",
        }
        mq(data)

    exit(1)


def startTimer():
    from threading import Timer
    sys.stdout = io.TextIOWrapper(io.BufferedWriter(sys.stdout.buffer, 1024))

    class RepeatTimer(Timer):
        def run(self):
            while not self.finished.wait(self.interval):
                self.function(*self.args, **self.kwargs)

    def flushOut():
        sys.stdout.flush()

    config.__timer = RepeatTimer(1, flushOut)
    config.__timer.daemon = True
    config.__timer.start()
