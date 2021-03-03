#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/filehandler.py

"""
   These are specific functions to be used for handling files
   The most important once are getFile and saveFile
"""

import ibm_boto3
import io
from ibm_botocore.client import Config
import pandas as pd
from pathlib import Path
from diemlib.main import error


class filehandler(object):
    def __init__(self, cos):
        self.ibm_api_key_id = cos["__ibm_api_key_id"]
        self.ibm_service_instance_id = cos["__ibm_service_instance_id"]
        self.ibm_auth_endpoint = "https://iam.cloud.ibm.com/identity/token"
        self.endpoint_url = cos["__endpoint_url"]
        self.Bucket = cos["__Bucket"]

    def connect(self):

        try:

            s3c = ibm_boto3.client(
                "s3",
                ibm_api_key_id=self.ibm_api_key_id,
                ibm_service_instance_id=self.ibm_service_instance_id,
                ibm_auth_endpoint="https://iam.cloud.ibm.com/identity/token",
                config=Config(signature_version="oauth"),
                endpoint_url=self.endpoint_url,
            )
            return s3c

        except Exception as e:
            error(e)
            raise

    def saveLocal(self, file_name, file_body):
        # Saves a file locally
        with open("%s" % file_name, "w") as fout:
            fout.write(file_body)

    def saveFile(self, file_name, file_body=None, **kwargs):
        # Saves a file to Cloud Object Storage

        file_path = file_name

        if "file" in kwargs:
            file_path = kwargs.get("file")
            print(f"Using custom directory {file_path} to disk")

        if file_body:
            print(f"Saving local file {file_name} to disk")

            self.saveLocal(file_name, file_body)

        s3c = self.connect()

        print(
            f"Starting large file upload for {file_name} to bucket: {self.Bucket}")
        # set the chunk size to 5 MB
        part_size = 1024 * 1024 * 5

        # set threadhold to 5 MB
        file_threshold = 1024 * 1024 * 5

        # set the transfer threshold and chunk size in config settings
        transfer_config = ibm_boto3.s3.transfer.TransferConfig(
            multipart_threshold=file_threshold, multipart_chunksize=part_size
        )

        # create transfer manager
        transfer_mgr = ibm_boto3.s3.transfer.TransferManager(
            s3c, config=transfer_config
        )

        try:
            # initiate file upload
            future = transfer_mgr.upload(file_path, self.Bucket, file_name)

            # wait for upload to complete
            future.result()

            print("Large file upload complete!")
        except Exception as e:
            error(e)
        finally:
            transfer_mgr.shutdown()

    def getFile(self, file, **kwargs):
        # Gets a file from Cloud Object Storage

        try:

            s3c = self.connect()
            obj = s3c.get_object(Bucket=self.Bucket, Key=file)
            file_type = Path(file).suffix

            body = io.BytesIO(obj["Body"].read())

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

    def loadFile(self, file):

        try:

            s3c = self.connect()
            obj = s3c.get_object(Bucket=self.Bucket, Key=file)

            return io.BytesIO(obj["Body"].read())

        except Exception as e:
            error(e)
            raise

    def readString(self, file):

        try:

            bytes = self.loadFile(file)
            return bytes.read().decode("UTF-8")

        except Exception as e:
            error(e)
            raise

    def download(self, file, filename=None):

        try:

            savefile = file

            if filename is not None:
                savefile = filename

            g = self.loadFile(file)
            f = open(savefile, "wb")
            f.write(g.getbuffer())
            f.close()

            return

        except Exception as e:
            error(e)
            raise


def savePandas(filename, df):
    file_type = Path(filename).suffix

    try:

        if file_type == ".json":
            df.to_json(filename)
        elif file_type == ".pickle":
            df.to_pickle(filename)
        elif file_type == ".parquet":
            df.to_parquet(filename)
        elif file_type == ".xlsx":
            df.to_excel(filename, sheet_name="Sheet_name_1")
        elif file_type == ".html":
            df.to_html(filename)
        elif file_type == ".csv":
            df.to_csv(filename, index=False)
        else:
            df.to_csv(filename)
        return

    except Exception as e:
        error(e)
        raise
