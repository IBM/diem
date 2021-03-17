#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/box.py

"""
   These are specific functions to be used for handling files
   The most important once are getFile and saveFile
"""

from boxsdk import JWTAuth, Client
from io import StringIO
from pathlib import Path
import pandas as pd
from diemlib.main import error


class Box(object):
    def __init__(self, auth):
        config = JWTAuth.from_settings_dictionary(auth)
        self.client = Client(config)

    def readFile(self, file, **kwargs):
        # gets a file from box

        try:

            file_type = Path(file).suffix

            file_content = self.client.file(file).content()
            body = StringIO(str(file_content, "utf-8"))

            if file_type == ".pickle":
                df = pd.read_pickle(body)
                return df
            elif file_type == ".parquet":
                df = pd.read_parquet(body, **kwargs)
                return df
            elif file_type == ".csv":
                df = pd.read_csv(body, encoding="utf8", **kwargs)
                return df
            else:
                df = pd.read_csv(body, encoding="utf8", **kwargs)
            return df

        except Exception as e:
            error(e)
            raise

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

            self.client.folder(folder).upload_stream(body, file)
            return file

        except Exception as e:
            error(e)
            raise
