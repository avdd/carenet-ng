# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import click
from . import core
from . import web

import logging
log = logging.getLogger(__name__)

DEFAULT_RUN_HOST='0.0.0.0'
DEFAULT_RUN_PORT = 8099


def web_factory():
    return core.context()

def script_factory(info):
    return core.context({})

class ScriptInfo:
    pass


handler = web.handler(core.registry)
wsgi = web.wsgi_wrapper(handler, factory=web_factory)
cli = click.Group() #script_factory)
main = cli.main
pass_info = click.make_pass_decorator(ScriptInfo, ensure=True)


def cgi():
    def handle(environ, start_response):
        if environ.get('HTTP_X_FORWARDED_PROTO') == 'https':
            environ['wsgi.url_scheme'] = 'https'
        return wsgi(environ, start_response)
    from wsgiref.handlers import CGIHandler
    return CGIHandler().run(handle)


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
@pass_info
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
@pass_info
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


