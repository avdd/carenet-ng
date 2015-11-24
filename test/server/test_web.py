# -*- coding: utf-8 -*-
from __future__ import absolute_import
__metaclass__ = type

import pytest
import simplejson as json
from carenetng import app
from carenetng import web


class TestContext:
    def close(self):
        pass


def _make_api():

    from werkzeug.test import Client

    def call(url, data=None, json_data=None,
             content_type='application/json', encoding='utf-8'):
        c = Client(wsgi, web.WsgiResponse)
        if json_data is not None:
            content_type='application/json'
        elif 'json' in content_type:
            json_data = json.dumps(data, encoding=encoding)
        rsp = c.post(url,
                     content_type=content_type,
                     headers=[('accept', 'application/json')],
                     data=json_data)
        if 'json' in rsp.mimetype:
            rsp.json = json.loads(rsp.data)
        else:
            rsp.json = None
        return rsp

    def handle_request(rq):
        api.request = rq
        return handler(rq)

    api = app.create_registry()
    api.call = call
    handler = web.handler(api.registry)
    wsgi = web.WsgiWrapper(handle_request, factory=TestContext)
    return api


@pytest.fixture
def testapi():
    import datetime
    api = _make_api()

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

    return api


def test_not_json(testapi):
    rsp = testapi.call('empty', 'not json', content_type='')
    assert rsp.status_code == 200

def test_notfound(testapi):
    rsp = testapi.call('foo')
    assert rsp.status_code == 404
    #assert 'error' in rsp.json
    #assert '404' in rsp.json['error']

def test_validate_missing(testapi):
    rsp = testapi.call('addDate')
    assert rsp.status_code == 400
    #assert 'error' in rsp.json
    #assert '400' in rsp.json['error']

def test_validate_badarg(testapi):
    rsp = testapi.call('addDate', {'d':1, 'i': 'x'})
    assert rsp.status_code == 400
    #assert 'error' in rsp.json
    #assert '400' in rsp.json['error']

def test_dates(testapi):
    args = {'d': '2001-01-01', 'i': 2}
    rsp = testapi.call('addDate', args)
    assert rsp.status_code == 200
    #expect = 'Wed, 03 Jan 2001 00:00:00 GMT'
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
    #assert rsp.status_code == 200
    assert rsp.status_code == 500
    #assert 'error' in rsp.json
    #assert 'assert' in rsp.json['error']['message']

def test_empty(testapi):
    rsp = testapi.call('empty')
    assert rsp.status_code == 200
    assert rsp.json == {'result': None}

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
    #assert rsp.json is None

