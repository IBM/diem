#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/box.py

"""
   These are specific functions to be used for handling files
   The most important once are getFile and saveFile
"""

from boxsdk import JWTAuth, Client
from boxsdk.exception import BoxAPIException
from io import StringIO
from pathlib import Path
import pandas as pd
from diemlib.main import error
from diemlib.util import dictX
import chardet
import openpyxl


class Box(object):
    def __init__(self, auth):
        config = JWTAuth.from_settings_dictionary(auth)
        self.client = Client(config)

    def fileInfo(self, file_id):
        try:
            t = self.client.file(file_id).get()
            return dictX(t.response_object)
        except BoxAPIException as e:
            error(e)

    def deleteFile(self, file_id):
        try:
            t = self.client.file(file_id).delete()
            return t
        except BoxAPIException as e:
            error(e)

    def readFile(self, file_id, **kwargs):
        # gets a file from box

        try:

            # get the file info
            file_info = self.fileInfo(file_id)

            # get the file extention
            file_type = Path(file_info.name).suffix

            # read file content
            file_content = self.client.file(file_id).content()

            # detect the encoding
            encoding = chardet.detect(file_content)

            # if no encoding then pass bytes
            if not encoding["encoding"] == None:
                body = StringIO(str(file_content, encoding["encoding"]))
            else:
                body = file_content

            if file_type == ".pickle":
                df = pd.read_pickle(body)
                return df
            elif file_type == ".parquet":
                df = pd.read_parquet(body, **kwargs)
                return df
            elif file_type == ".csv":
                df = pd.read_csv(body, encoding="utf8", **kwargs)
                return df
            elif file_type == ".xlsx":
                df = pd.read_excel(body, engine='openpyxl', **kwargs)
                return df
            else:
                df = pd.read_csv(body, encoding="utf8", **kwargs)
            return df

        except Exception as e:
            error(e)

    def saveFile(self, df, file, folder=0, **kwargs):
        # saves a file to box

        try:

            file_type = Path(file).suffix

            body = StringIO()

            if file_type == ".pickle":
                df.to_pickle(body)
            elif file_type == ".parquet":
                df.to_parquet(body, **kwargs)
            elif file_type == ".csv":
                df.to_csv(body, encoding="utf8", **kwargs)
            else:
                pd.to_csv(body, encoding="utf8", **kwargs)

            t = self.client.folder(folder).upload_stream(body, file)
            return dictX(t.response_object)

        except BoxAPIException as e:
            error(e)
