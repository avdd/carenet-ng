# -*- coding: utf-8 -*-
from __future__ import absolute_import
__metaclass__ = type

import pytest
import simplejson as json
from carenetng import core
from carenetng import web


class TestContext:
    def close(self):
        pass


def _make_wsgi():

    from werkzeug.test import Client

    def call(url, data=None, json_data=None,
             content_type='application/json', encoding='utf-8'):
        c = Client(wsgi, web.Response)
        if json_data is not None:
            content_type='application/json'
        elif 'json' in content_type:
            json_data = json.dumps(data, encoding=encoding)
        rsp = c.post(url,
                     content_type=content_type,
                     headers=[('accept', 'application/json')],
                     data=json_data)
        assert 'json' in rsp.mimetype
        rsp.json = json.loads(rsp.data)
        assert rsp.json is not None
        return rsp

    def handle_request(rq):
        wsgi.request = rq
        return handler(rq)

    api = core.create_registry()
    handler = web.handler(api.registry)
    wsgi = web.wsgi_wrapper(handle_request, factory=TestContext)
    wsgi.api = api
    wsgi.call = call
    return wsgi


@pytest.fixture
def testapi():
    import datetime
    wsgi = _make_wsgi()
    api = wsgi.api

    def isodate(s):
        return datetime.date(*map(int, s.split('-')))

    @api(d=isodate, i=int)
    def addDate(cx, d, i):
        assert i > 0
        return d + datetime.timedelta(i)

    @api(s=str, u=unicode)
    def concat(cx, s, u):
        return s + u

    @api()
    def empty(cx):
        return None

    @api()
    def uuid(cx):
        import uuid
        return uuid.UUID('ea676bb8-26f8-4729-93d1-65dbd5fbdd65')

    @api()
    def bad(cx):
        return object()

    return wsgi


def test_not_json(testapi):
    rsp = testapi.call('empty', 'not json', content_type='text/plain')
    assert rsp.status_code == 200
    assert rsp.json == {'result': None}

def test_notfound(testapi):
    rsp = testapi.call('foo')
    assert rsp.status_code == 404
    assert rsp.json == {'error': {'message': 'Not found'}}

def test_validate_missing(testapi):
    rsp = testapi.call('addDate')
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

def test_validate_badarg(testapi):
    rsp = testapi.call('addDate', {'d':1, 'i': 'x'})
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

def test_dates(testapi):
    args = {'d': '2001-01-01', 'i': 2}
    rsp = testapi.call('addDate', args)
    assert rsp.status_code == 200
    expect = '2001-01-03'
    assert rsp.json == {'result': expect}

def test_strings(testapi):
    args = {'s': 'foo', 'u': 'bar'}
    rsp = testapi.call('concat', args)
    assert rsp.status_code == 200
    assert rsp.json == {'result': 'foobar'}

def test_validate_exception(testapi):
    args = {'d': '2001-01-01', 'i': 0}
    rsp = testapi.call('addDate', args)
    assert rsp.status_code == 500
    assert rsp.json == {'error': {'message': 'Internal server error'}}

def test_empty(testapi):
    rsp = testapi.call('empty')
    assert rsp.status_code == 200
    assert rsp.json == {'result': None}

def test_uuid(testapi):
    rsp = testapi.call('uuid')
    assert rsp.status_code == 200
    assert rsp.json == {'result': 'ea676bb8-26f8-4729-93d1-65dbd5fbdd65'}

def test_bad_response(testapi):
    rsp = testapi.call('bad')
    assert rsp.status_code == 500
    assert rsp.json == {'error': {'message': 'Internal server error'}}

def test_context(testapi):
    testapi.call('empty')
    assert isinstance(testapi.request.context, TestContext)

def test_json_charset(testapi):
    arg = {'s': 'x', 'u': u'Hällo Wörld'.encode('iso-8859-15')}
    rsp = testapi.call('concat', arg,
                       encoding='iso-8859-15',
                       content_type='application/json;charset=iso-8859-2')
    assert rsp.status_code == 200
    assert rsp.json == {'result': u'xHällo Wörld'}

def test_json_alt_type(testapi):
    arg = dict(s='s', u='u')
    rsp = testapi.call('concat', arg, content_type='application/foo+json')
    assert rsp.status_code == 200
    assert rsp.json == {'result': 'su'}

def test_bad_json(testapi):
    arg = 'not json'
    rsp = testapi.call('concat', json_data=arg)
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

