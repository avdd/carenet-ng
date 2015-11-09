# -*- coding: utf8 -*-


from . import api


@api('login')
def login(cx):
    u = cx.arg.get('username')
    p = cx.arg.get('password')
    # FIXME: config!
    result = u == 'mister' and p == 'bungle'
    if result:
        return {'result': result}
    else:
        return {'error': {'message': 'Login failed'}}
    #return {'login': u'ok ♫'}



