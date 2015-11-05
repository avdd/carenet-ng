# -*- coding: utf8 -*-

import os
import sys
import flak

ENVIRON_KEY = 'CARENET_ENV'

app = flak.Flak(__name__, root_path=sys.prefix)
app.app_env = os.environ.get(ENVIRON_KEY)

config_file = os.path.join(sys.prefix, 'config.py')
if app.config.from_pyfile(config_file, silent=True): # pragma: no cover
    app.config_file = config_file
else:
    app.config_file = None

def route(url):
    return app.route('/' + url, methods=['GET', 'POST'])

def api(url):
    def decorate(f):
        return route(url)(as_json(f))
    return decorate

def as_json(f):
    def handle(cx):
        cx.arg = cx.get_json() or {}
        result = f(cx)
        status = 200
        headers = [('Content-Type', 'application/json'),
                   ('X-Environ', app.app_env or '')]
        return cx.dumps(result), status, headers
    return handle

@route('ping')
def ping(cx): # pragma: no cover
    #e = cx.request.environ
    #print >>sys.stderr, e.get('REQUEST_ENV')
    version = app.app_env or 'UNDEFINED'
    rqenv = cx.request.environ.get('REQUEST_ENV', 'UNDEFINED')
    headers = [('x-app-env', app.app_env or 'UNDEFINED'),
               ('x-request-env', rqenv)]
    return 'PONG ' + version, 200, headers

@app.errorhandler(Exception)
def error(cx, e): # pragma: no cover
    status = 500
    headers = [('Content-Type', 'application/json')]
    result = {'error': str(e)}
    return cx.dumps(result), status, headers


