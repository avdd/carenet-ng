# -*- coding: utf8 -*-

import os
import sys
import flak
import functools

ENVIRON_KEY = 'CARENET_ENV'

app = flak.Flak(__name__, root_path=sys.prefix)
app.app_env = os.environ.get(ENVIRON_KEY)

app.config['CROWD_DB_URL'] = 'postgresql://cf_crowd@:5433/cf_crowd_live'
app.config['CROWD_DB_URL'] = 'postgresql:///crowdtest'


from . import crowd
from sqlalchemy import create_engine
from sqlalchemy.orm import create_session


def authenticate(cx, u, p): # pragma: no cover
    url = app.config['CROWD_DB_URL']
    db = create_session(create_engine(url))
    try:
        u = crowd.get_authenticated_user(db, u, p)
    except crowd.SecurityException:
        return False
    else:
        return True

app.authenticate = authenticate


def route(url):
    return app.route('/' + url, methods=['GET', 'POST'])


def api(url):
    decorated = route(url)
    def decorator(f):
        f = as_json(f)
        return decorated(f)
    return decorator

def as_json(f):
    @functools.wraps(f)
    def handle(cx):
        cx.arg = cx.get_json() or {}
        result = f(cx)
        status = 200
        headers = [('Content-Type', 'application/json')]
        return cx.dumps(result), status, headers
    return handle

@api('ping')
def ping(cx): # pragma: no cover
    #e = cx.request.environ
    #print >>sys.stderr, e.get('REQUEST_ENV')
    env = app.app_env or 'UNDEFINED'
    rqenv = cx.request.environ.get('REQUEST_ENV', 'UNDEFINED')
    headers = [('x-app-env', env),
               ('x-request-env', rqenv)]
    return 'PONG ' + env

@app.errorhandler(Exception)
def error(cx, e): # pragma: no cover
    import traceback; traceback.print_exc()
    status = 500
    headers = [('Content-Type', 'application/json')]
    result = {'error': str(e)}
    return cx.dumps(result), status, headers


