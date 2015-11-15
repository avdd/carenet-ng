# -*- coding: utf8 -*-

from . import api
from .app import app

@api('login')
def login(cx):
    u = cx.arg.get('username') or ''
    p = cx.arg.get('password') or ''
    result = app.authenticate(cx, u, p)

    if result:
        return {'result': result}
    else:
        return {'error': {'message': 'Login failed'}}


