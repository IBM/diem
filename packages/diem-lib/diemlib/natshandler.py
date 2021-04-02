#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/nats.py

"""
   This this the meain module
   It contains generic functions that can be used within the jobs
"""

import asyncio
from nats.aio.client import Client as NATS
from nats.aio.errors import ErrConnectionClosed, ErrTimeout
import diemlib.config as config
import json

nats_fallbackurl = config.__url

class NatsConnection:
    async def connect(self):
        self.usenats = False
        if hasattr(self, 'nc'):
            self.usenats = True
            return self
        try:
            self.nc = NATS()
            await self.nc.connect(config.natsurl)
            self.usenats = True
            print('nats: connected')
        except Exception as e:
            self.usenats = False
            print('nats: using request fallback')
        return self
    async def __aenter__(self):
        await self.connect()
        return self
    async def __aexit__(self, *args, **kwargs):
        return
    async def publish(self,data):
        data_enc = json.dumps(data).encode()
        if self.usenats:
            await self.nc.publish(config.natschannel, data_enc)
            print('nats: message sent')
        else:
            try:
                requests.post(url=nats_fallbackurl, data=data_enc)
            except Exception as e:
                print('nats: fatal error')
                print(e)

class NatsService:
    def __init__(self):
        self.nc = NatsConnection()
        self.loop = asyncio.get_event_loop()
    def publish(self,msg):
        return self.loop.run_until_complete(self._publish(msg))
    async def _publish(self,msg):
        async with self.nc:
            await self.nc.publish(msg)