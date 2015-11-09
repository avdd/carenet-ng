# -*- coding: utf8 -*-

import json
import pytest
from flak.wrappers import Response
from werkzeug.utils import cached_property
from carenetng.app import app


TEST_USER = {
    'username': 'test-user',
    'password': 'the-test-password'
}

class JsonResponse(Response):
    @cached_property
    def json(self):
        if 'json' not in self.mimetype:
            raise AttributeError('Not a JSON response')
        try:
            from simplejson import loads
        except ImportError:
            from json import loads
        return loads(self.data)


app.response_class = JsonResponse
app.config['TEST_USER'] = TEST_USER


def client():
    c = app.test_client()
    def send(url, args):
        return c.post(url,
                      content_type='application/json',
                      headers=[('accept', 'application/json')],
                      data=json.dumps(args))
    c.send = send
    return c


def test_login_rejects_invalid():
    rv = client().send('login', {})
    assert 'error' in rv.json
    assert rv.json and not rv.json.get('result')


def test_login_rejects_valid():
    u = {'username': TEST_USER['username'],
         'password': TEST_USER['password']}
    rv = client().send('login', u)
    assert 'result' in rv.json
    assert rv.json and rv.json.get('result')

