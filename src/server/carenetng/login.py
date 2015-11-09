# -*- coding: utf8 -*-


from . import api

from .app import app

@api('login')
def login(cx):
    u = cx.arg.get('username')
    p = cx.arg.get('password')

    user = app.config.get('TEST_USER')
    if not user:
        user = {
            'username': 'mister',
            'password': 'bungle',
        }

    result = u == user['username'] and p == user['password']
    if result:
        return {'result': result}
    else:
        return {'error': {'message': 'Login failed'}}
    #return {'login': u'ok ♫'}



