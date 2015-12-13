# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import os
import click
import logging

from . import core
from . import web

log = logging.getLogger(__name__)

DEFAULT_RUN_HOST='0.0.0.0'
DEFAULT_RUN_PORT = 8099

cli = click.Group()
#pass_info = click.make_pass_decorator(ScriptInfo, ensure=True)


wsgi = None


def init():
    global wsgi
    config = get_config()
    #init_logging(config)
    init_modules()
    wsgi = web.wsgi_wrapper(handler = web.handler(core.registry),
                            factory = lambda:core.context(config))


def get_config():
    env = os.environ.get('CARENET_ENV', 'UNDEFINED')
    e = os.environ.get('SCRIPT_NAME')
    if e and '/api.cgi' in e:
        env += ':' + e.split('/')[-2]
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from . import auth
    if 'public' in env:
        db = 'cf_carenet@:5433/cf_carenet_live'
    else:
        db = '/carenet_test'
    DB = sessionmaker(create_engine('postgresql://' + db))
    return dict(DB=DB,
                get_auth_repo = lambda:auth.Repository(DB()),
                env=env)


def main():
    import os
    gi = os.environ.get('GATEWAY_INTERFACE')
    if gi and 'CGI' in gi:
        return cgi()
    else:
        return cli.main()


def cgi():
    def handle(environ, start_response):
        if environ.get('HTTP_X_FORWARDED_PROTO') == 'https':
            environ['wsgi.url_scheme'] = 'https'
        return wsgi(environ, start_response)
    from wsgiref.handlers import CGIHandler
    return CGIHandler().run(handle)


def init_modules():
    from . import login


def init_logging(config):
    log.info('startup')
    root = logging.getLogger()
    root.handlers[:] = []
    root.addHandler(logging.FileHandler('/tmp/out.log'))


@cli.command('foo')
@click.argument('baz')
@click.option('--bar', help='the bar opt')
@click.pass_context
def foo(cx, baz, bar=None):
    print 'got cx:', cx
    print 'got baz:', baz
    if bar:
        print 'got bar:', bar


@cli.command('upgrade')
@click.pass_context
def upgrade_db(cx):
    'TODO'
    print 'upgrading DB ...'


@cli.command('logtree')
def logtree():
    log.debug('logtree')
    import logging_tree
    logging_tree.printout()


#@cli.command()
def run(cx):
    log.debug('running')
    wsgi.debug = True
    wsgi.run()


@cli.command('run', short_help='Run a development server')
@click.option('--host', '-h', default=DEFAULT_RUN_HOST,
              help='The interface to bind to.')
@click.option('--port', '-p', default=DEFAULT_RUN_PORT,
              help='The port to bind to.')
@click.option('--reload/--no-reload', default=None,
              help='Enable or disable the reloader.  By default the reloader '
              'is active if debug is enabled.')
@click.option('--debugger/--no-debugger', default=None,
              help='Enable or disable the debugger.  By default the debugger '
              'is active if debug is enabled.')
@click.option('--with-threads/--without-threads', default=False,
              help='Enable or disable multithreading.')
#@pass_info
def run_command(info, host, port, reload, debugger, with_threads):
    if reload is None:
        reload = info.debug
    if debugger is None:
        debugger = info.debug
    from werkzeug.serving import run_simple
    run_simple(host, port, app,
               use_reloader=reload,
               use_debugger=debugger,
               threaded=with_threads)




@cli.command('shell', short_help='Runs a shell with an app context')
#@click.pass_context
#@pass_info
def shell_command(info):
    app = info.load_app()
    banner = 'Python %s on %s\nApp: %s%s\nInstance: %s' % (
        sys.version,
        sys.platform,
        '<app>', #app.name,
        '', #app.debug and ' [debug]' or '',
        '', #app.instance_path,
    )
    cx = {}

    #cx.update(app.make_shell_context())
    import code
    code.interact(banner=banner, local=cx)


init()


