#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/mailhandler.py

"""
   These are specific functions to be used for handling mail
   This one uses sendgrid
"""


from sendgrid.helpers.mail import (
    Mail,
    Attachment,
    FileContent,
    FileType,
    Disposition,
    ContentId,
)
from sendgrid import SendGridAPIClient
import base64
from diemlib.main import error, out
from diemlib.util import get_random_string
import diemlib.config as config
import mimetypes


class mailhandler(object):
    def __init__(self):

        self.sg = SendGridAPIClient(config.api_key)

    def make_attachment(self, attachment):

        if isinstance(attachment, tuple):
            fileName = attachment[0]
            data = attachment[1]

        else:
            fileName = attachment
            with open(fileName, "rb") as f:
                data = f.read()
                f.close()

        encoded = base64.b64encode(data).decode()

        mail_attachment = Attachment()
        mail_attachment.file_content = FileContent(encoded)
        mail_attachment.file_name = fileName
        mail_attachment.disposition = Disposition("attachment")

        # create the content_id based on a random string
        content_id = get_random_string(8)
        mail_attachment.content_id = ContentId(content_id)

        mime_type = mimetypes.guess_type(fileName)

        mail_attachment.file_type = FileType(mime_type[0])

        return mail_attachment

    def mail(self, **kwargs):

        message = Mail(
            from_email=kwargs.get("sender"),
            to_emails=kwargs.get("to"),
            subject=kwargs.get("subject"),
            html_content=kwargs.get("content"),
        )

        # check if there are attachments
        if "attachments" in kwargs:

            attachments_array = []

            attachments = kwargs.get("attachments")

            if isinstance(attachments, list):
                for attachment in attachments:
                    att = self.make_attachment(attachment)
                    attachments_array.append(att)

            else:
                att = self.make_attachment(attachments)
                attachments_array.append(att)

            # add the attachment array to the message object
            message.attachment = attachments_array

        self.sendMail(message)

    def sendMail(self, message):
        try:

            response = self.sg.send(message)
            out(
                f"mail successfully sent - response status: {response.status_code}")

        except Exception as e:
            error(e)
