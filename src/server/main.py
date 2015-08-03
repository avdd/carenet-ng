
import json
import flak

http_info = '''
path_info
request_method
remote_addr
request_uri
query_string
content_length
content_type
script_name
'''.split()

app = flak.Flak(__name__)

@app.route('/')
def home(cx):
    return 'home'

def wsgi(environ, start_response):

    stderr = environ['wsgi.errors']

    if environ.get('SCRIPT_NAME', '') in ('', '/'):
        print >>stderr, 'setting SCRIPT_NAME=/api'
        environ['SCRIPT_NAME'] = '/api'

    from wsgiref import util
    print >>stderr, util.request_uri(environ)
    print >>stderr, util.application_uri(environ)

    content_type = 'application/json'
    headers = [('Content-Type', content_type)]
    status = '200 OK'
    start_response(status, headers)
    info = {k: v for (k, v) in environ.items()
            if k.startswith('HTTP')
            or k.lower() in http_info}
    return [json.dumps(info)]

if __name__ == '__main__':
    from wsgiref.handlers import CGIHandler as cgi
    cgi().run(wsgi)

