#!/usr/bin/env python
# -*- coding: utf-8 -*-

# diemlib/main.py

"""
   These are some utilities
"""

import random
import string

# some other utilities


def get_random_string(length=10):
    # Random string with the combination of lower and upper case
    letters = string.ascii_letters
    return "".join(random.choice(letters) for i in range(length))


def guid():
    # Creates 36 UUID
    import uuid

    return str(uuid.uuid1())
