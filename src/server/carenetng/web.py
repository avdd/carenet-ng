# -*- coding: utf-8 -*-
# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import os
import sys
import json
import datetime

from werkzeug import exceptions
from werkzeug.wrappers import (Request as BaseRequest,
                               Response as BaseResponse)

import logging
log = logging.getLogger(__name__)


def cgi(wsgi): # pragma: no cover
    def handle(environ, start_response):
        if environ.get('HTTP_X_FORWARDED_PROTO') == 'https':
            environ['wsgi.url_scheme'] = 'https'
        return wsgi(environ, start_response)
    from wsgiref.handlers import CGIHandler
    return lambda: CGIHandler().run(handle)


def handler(registry):
    return lambda rq: _dispatch(registry, rq)


def _dispatch(registry, rq):
    script_name = rq.environ.get('SCRIPT_NAME') or '/'
    path = rq.path[len(script_name):]

    try:
        f, spec = registry[path]
    except KeyError:
        return exceptions.NotFound()

    try:
        args = _process_args(spec, rq)
    except Exception, e:
        log.exception('error processing json args')
        return exceptions.BadRequest(e)

    try:
        result = f(rq.context, **args)
        rsp = {'result': result}
    except Exception, e:
        raise
        #log.exception('error handling request; %s', e)
        #rsp = {'error': {'message': e.message or 'Unknown error'}}
    data = json.dumps(rsp, cls=JSONEncoder)
    return WsgiResponse((data, '\n'), mimetype='application/json')



def _process_args(spec, rq):
    j = get_json(rq) or {}
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


def get_json(rq):
    mt = rq.mimetype
    if mt != 'application/json':
        if not (mt.startswith('application/') and mt.endswith('+json')):
            return

    charset = rq.mimetype_params.get('charset')
    data = rq.get_data()
    kw = {'cls': JSONDecoder}
    if charset is not None:
        kw['encoding'] = charset
    try:
        return json.loads(data, **kw)
    except ValueError as e:
        log.error('Failed to decode JSON object: {0}'.format(e))
        raise exceptions.BadRequest()


class WsgiWrapper:

    debug = False

    def __init__(self, handler, factory, config=None):
        self.handler = handler
        self.context_factory = factory
        self.config = config

    def wsgi_app(self, environ, start_response):
        cx = self.context_factory()
        rq = WsgiRequest(self, cx, environ)
        try:
            rsp = self.handler(rq)
        except:
            msg = 'Unhandled exception in %s %s' % (rq.method, rq.path)
            log.exception(msg)
            rsp = exceptions.InternalServerError()
        finally:
            rq.close()
            if hasattr(cx, 'close'):
                cx.close()

        return rsp(environ, start_response)

    __call__ = wsgi_app



class WsgiResponse(BaseResponse):
    default_mimetype = 'text/plain'


class WsgiRequest(BaseRequest):

    def __init__(self, app, cx, environ):
        BaseRequest.__init__(self, environ)
        # clean up circular dependencies
        environ['werkzeug.request'] = None
        self.context = cx
        self.app = app
        self.debug = app.debug
        #self.max_content_length = app.config['MAX_CONTENT_LENGTH'] or None


class JSONEncoder(json.JSONEncoder):
    def default(self, o): # pragma: no cover
        if isinstance(o, datetime.date):
            return str(o)
        if isinstance(o, uuid.UUID):
            return str(o)
        return json.JSONEncoder.default(self, o)


class JSONDecoder(json.JSONDecoder):
    pass



