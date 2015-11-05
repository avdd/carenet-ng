# -*- coding: utf8 -*-


from . import api


@api('login')
def login(cx):
    u = cx.arg.get('username')
    p = cx.arg.get('password')
    result = u == 'test' and p == 'test'
    msg = None
    if not result:
        msg = 'Login failed'
    return {'result': result,
            'message': msg}
    #return {'login': u'ok ♫'}



