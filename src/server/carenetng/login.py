# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import logging
log = logging.getLogger(__name__)

from .core import api
from . import crowd


@api(username=str, password=str)
def login(cx, username, password):
    repo = cx.get_crowd_repository()
    try:
        repo.authenticate(username, password)
        log.info('LOGIN OK %s', username)
        return create_session(cx, username)
    except crowd.SecurityException, e:
        log.info('LOGIN FAILED: %s', e)
        return None



def create_session(cx, user):
    return True


