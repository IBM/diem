#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/jobhandler.py

"""
   These are a few funtions to start and stop a job
   to be used only for internal calls
"""

__all__ = ["stopJob", "startJob"]

import diemlib.config as config
from diemlib.main import error
import requests

def startJob(id):
    try:
        job = {
            "id": id,
            "org": config.__org,
            "action": "start",
            "transid": config.__transid,
            "email": config.__email,
            "jobid": id,
        }
        url = f"http://{config.__appname}/internal/apijob"
        x = requests.post(url, data = job)
        return(x.text)
    except requests.exceptions.RequestException as e:
        raise e

def stopJob(id):
    try:
        job = {
            "id": id,
            "org": config.__org,
            "action": "stop",
            "transid": config.__transid,
            "email": config.__email,
            "jobid": id,
        }
        url = f"http://{config.__appname}/internal/apijob"
        x = requests.post(url, data = job)
        return(x.text)
    except requests.exceptions.RequestException as e:
        raise e