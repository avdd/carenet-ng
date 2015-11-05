# -*- coding: utf8 -*-

# pragma: no cover

from carenetng.app import app

def cgi_app(environ, start_response):
    if environ.get('HTTP_X_FORWARDED_PROTO') == 'https':
        environ['wsgi.url_scheme'] = 'https'
    return app(environ, start_response)

def serve_cgi():
    from wsgiref.handlers import CGIHandler as cgi
    cgi().run(cgi_app)

def upgrade_db():
    'TODO'
    print 'upgrading DB ...'


