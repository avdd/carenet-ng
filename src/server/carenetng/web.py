# -*- coding: utf-8 -*-
# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import os
import sys
import uuid
import datetime
import simplejson as json

from werkzeug.wrappers import Request, Response

import logging
log = logging.getLogger(__name__)


def wsgi_wrapper(handler, factory):

    def _wsgi_app(environ, start_response):
        rq = Request(environ)
        environ['werkzeug.request'] = None
        cx = rq.context = factory()
        try:
            rsp = handler(rq)
        finally:
            rq.close()
            if hasattr(cx, 'close'):
                cx.close()
        return rsp(environ, start_response)

    return _wsgi_app


def handler(registry):
    return lambda rq: _dispatch(registry, rq)


def _dispatch(registry, rq):
    script_name = rq.environ.get('SCRIPT_NAME') or '/'
    path = rq.path[len(script_name):]

    try:
        f = registry[path]
    except KeyError:
        return _response_error(404, 'Not found')

    try:
        if not _check_request(rq, f):
            return _response_error(403, 'Not allowed')
    except:
        log.exception('%s error checking access', rq.path)
        return _response_error(500, 'Internal server error')

    try:
        args = _process_args(rq, f)
    except:
        log.exception('%s error processing request args', rq.path)
        return _response_error(400, 'Bad request')

    try:
        result = f(rq.context, **args)
        return _response_json(200, {'result': result})
    except:
        log.exception('%s unhandled exception', rq.path)
        return _response_error(500, 'Internal server error')


def _check_request(rq, f):
    spec = f.__api_check
    if spec is True:
        return True
    return spec(rq)


def _process_args(rq, f):
    spec = f.__api_arg_spec
    j = _request_json(rq) or {}
    rqargs = rq.args
    out = {}
    for k, t in spec.items():
        try:
            v = j[k]
        except KeyError:
            # XXX debug only?
            v = rqargs[k]
        if t is str: # shortcut
            t = unicode
        out[k] = t(v)
    return out


def _request_json(rq):
    mt = rq.mimetype
    if mt != 'application/json':
        if not (mt.startswith('application/') and mt.endswith('+json')):
            return

    charset = rq.mimetype_params.get('charset')
    data = rq.get_data()
    kw = {'cls': JSONDecoder}
    if charset is not None:
        kw['encoding'] = charset
    return json.loads(data, **kw)


def _response_error(code, message):
    return _response_json(code, {'error': {'message': message}})


def _response_json(code, obj):
    data = json.dumps(obj, cls=JSONEncoder)
    return Response((data, '\n'),
                    status=code,
                    mimetype='application/json')


class JSONEncoder(json.JSONEncoder):
    def default(self, x):
        if isinstance(x, datetime.date):
            return str(x)
        if isinstance(x, uuid.UUID):
            return str(x)
        return json.JSONEncoder.default(self, x)


class JSONDecoder(json.JSONDecoder):
    pass



