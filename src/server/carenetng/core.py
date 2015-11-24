from __future__ import absolute_import
__metaclass__ = type

import uuid
import datetime
import dateutil.parser

from carenetng.registry import create_registry

import logging
log = logging.getLogger(__name__)

#from . import crowd
#from sqlalchemy import create_engine
#create_engine('postgresql:///cf_crowd_devel')

registry = {}
api = create_registry(registry)
converter = api._converter


class context:
    def __init__(self, *args):
        self.args = args
        log.info('CONTEXT OPENED: args=%s', args)

    def authenticate(self, username, password):
        ok = 'devel-only', 'password'
        if (username, password) == ok:
            return True


