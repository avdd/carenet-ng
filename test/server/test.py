# -*- coding: utf8 -*-

import json
import pytest
from flak.wrappers import Response
from werkzeug.utils import cached_property
from carenetng.app import app


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
    rv = client().send('login', dict(username='',
                                     password=''))
    assert 'error' in rv.json
    assert rv.json and not rv.json.get('result')


def test_login_rejects_valid():
    rv = client().send('login', dict(username='mister',
                                     password='bungle'))
    assert 'result' in rv.json
    assert rv.json and rv.json.get('result')

