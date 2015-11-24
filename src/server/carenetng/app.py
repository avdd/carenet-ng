from __future__ import absolute_import
__metaclass__ = type

import logging
log = logging.getLogger(__name__)

#from . import crowd
#from sqlalchemy import create_engine
#create_engine('postgresql:///cf_crowd_devel')

class context:
    def __init__(self, *args):
        self.args = args
        log.info('CONTEXT OPENED: args=%s', args)

    def authenticate(self, username, password):
        ok = 'devel-only', 'password'
        if (username, password) == ok:
            return True


def create_registry(registry=None):

    def factory(__key=None, **__spec):
        def decorator(f):
            _register(registry, f, __key, __spec)
            return f
        return decorator

    def _register(registry, f, key, spec):
        if key is None:
            key = f.__name__
        registry[key] = (f, spec)

    if registry is None:
        registry = {}

    factory.registry = registry
    return factory


registry = {}
api = create_registry(registry)


