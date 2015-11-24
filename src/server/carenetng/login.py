# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import logging
log = logging.getLogger(__name__)

from .core import api


@api(username=str, password=str)
def login(cx, username, password):
    if cx.authenticate(username, password):
        return create_session(cx, username)


def create_session(cx, user):
    return True


