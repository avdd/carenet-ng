from __future__ import absolute_import
__metaclass__ = type

import uuid
import datetime
import dateutil.parser

import logging
log = logging.getLogger(__name__)


def create_registry(registry=None):

    def factory(*args, **spec):
        key = check = None
        for x in args:
            if isinstance(x, basestring):
                key = x
            elif callable(x):
                check = x
            else:
                raise TypeError(args)
        if check is None:
            check = True
        def decorator(f):
            f.__api_arg_spec = spec
            f.__api_check = check
            _register(registry, f, key)
            return f
        return decorator

    def _register(registry, f, key):
        if key is None:
            key = f.__name__
        registry[key] = f

    if registry is None:
        registry = {}

    factory.registry = registry
    default_converters(factory)
    return factory


def converter_decorator(api):
    def converter(f):
        setattr(api, f.__name__, f)
        return f
    return converter


def default_converters(api):

    api.bool = bool
    api.int = int
    api.float = float
    api.str = unicode
    api.set = set
    converter = api.converter = converter_decorator(api)

    @converter
    class Object:
        def __init__(self, d):
            self.__dict__ = d

    @converter
    def UUID(x):
        return uuid.UUID(x)

    @converter
    def DateTime(x):
        return dateutil.parser.parse(x)

    @converter
    def Date(x):
        return dateutil.parser.parse(x).date()

    @converter
    def List(T):
        def convert(xs):
            return [T(x) for x in xs]
        return convert

    @converter
    def Dict(K, T):
        def convert(d):
            return {K(k): T(v) for (k, v) in d.items()}
        return convert

