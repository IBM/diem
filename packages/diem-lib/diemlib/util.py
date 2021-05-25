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

# split a pandas dataframe in chuncks


def chunker(seq, size):
    return (seq[pos:pos + size] for pos in range(0, len(seq), size))

# dot annotation
# don't use reserved python words in dot assignment


class dictX(dict):
    def __getattr__(self, key):

        if not key in self:
            try:
                self[key] = value = dictX({})
                return value
            except KeyError as k:
                raise AttributeError(f'{key} is invalid.')
        try:
            if self[key] and type(self[key]) is dict:
                self[key] = value = dictX(self[key])
                return value
            else:
                return self[key]
        except KeyError as k:
            raise AttributeError(f'{key} is invalid.')

    def __setattr__(self, key, value):
        self[key] = value

    def __delattr__(self, key):
        try:
            del self[key]
        except KeyError as k:
            raise AttributeError(k)

    def __repr__(self):
        return dict.__repr__(self)
