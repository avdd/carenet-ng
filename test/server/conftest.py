
import pytest
import simplejson as json
from carenetng.app import app


#@pytest.fixture(autouse=True)
def setup():
    pass


def client():
    c = app.test_client()
    def send(url, args=None):
        rsp = c.post(url,
                     content_type='application/json',
                     headers=[('accept', 'application/json')],
                     data=json.dumps(args))
        if 'json' not in rsp.mimetype:
            raise AttributeError('Not a JSON response')
        rsp.json = json.loads(rsp.data)
        return rsp

    c.send = send
    return c

app.client = client

