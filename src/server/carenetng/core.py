from __future__ import absolute_import
__metaclass__ = type

import logging
from .registry import create_registry

log = logging.getLogger(__name__)

registry = {}
api = create_registry(registry)


class context:
    def __init__(self, config=None):
        if config:
            self.__dict__.update(config)
        msg = '\n'.join('  %s=%r' % x for x in config.items())
        log.info('CONTEXT OPENED:\n%s', msg)

