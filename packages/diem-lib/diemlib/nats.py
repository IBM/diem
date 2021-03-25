#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/main.py

"""
   This this the meain module
   It contains generic functions that can be used within the jobs
"""

import asyncio
from nats.aio.client import Client as NATS
from nats.aio.errors import ErrConnectionClosed, ErrTimeout
import diemlib.config as config

class Nats:
    def __init__(self):
        self.nc = NATS()
        self.loop = loop

    async def connect(self):
        try:
            await self.nc.connect(config.__url)
        except:
            pass

    async def publish(self, data):
        if not self.nc.is_connected:
            print("Connecting to nats")
            await self.connect()

        try:
            await self.nc.publish("diem.*", json.dumps(data).encode())
        except ErrConnectionClosed:
            print("Nats Connection closed prematurely")