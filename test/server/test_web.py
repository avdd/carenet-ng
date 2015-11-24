# -*- coding: utf-8 -*-
from __future__ import absolute_import
__metaclass__ = type

import uuid
import datetime
import pytest
import simplejson as json



SAMPLE_UUID = 'ea676bb8-26f8-4729-93d1-65dbd5fbdd65'


class TestContext:
    def close(self):
        pass


@pytest.fixture
def testapi():
    from carenetng import web
    from carenetng.registry import create_registry
    from werkzeug.test import Client

    api = create_registry()

    @api()
    def empty(cx):
        return None

    @api()
    def throws(cx):
        1 // 0

    @api()
    def badResponse(cx):
        return object()

    @api(s=str, u=unicode)
    def concat(cx, s, u):
        return s + u

    @api(d=api.Date, i=int)
    def addDate(cx, d, i):
        assert isinstance(d, datetime.date)
        return d + datetime.timedelta(i)

    @api('datetime', d=api.DateTime)
    def _datetime(cx, d):
        assert isinstance(d, datetime.datetime)
        return str(d.time())

    @api(u=api.UUID)
    def uuidTest(cx, u):
        assert isinstance(u, uuid.UUID)
        return uuid.UUID(SAMPLE_UUID)

    @api(x=api.Object)
    def obj(cx, x):
        assert isinstance(x, api.Object)
        return [x.a, x.b]

    @api(l=api.List(int))
    def listTest(cx, l):
        assert type(l) is list
        for x in l:
            assert isinstance(x, int)
        return l + [3,4]

    @api(d=api.Dict(int, api.UUID))
    def dictTest(cx, d):
        assert type(d) is dict
        for x in d.values():
            assert type(x) is uuid.UUID
        return {2: d.values()[0]}

    @api(lambda rq:False)
    def notallowed(cx):
        assert False

    @api(lambda rq:1/0)
    def badallow(cx):
        assert False

    try:
        api(object())
    except TypeError:
        pass
    else:
        assert False

    def call(url, data=None, json_data=None,
             content_type='application/json', encoding='utf-8'):
        if json_data is not None:
            assert data is None
            content_type='application/json'
        elif 'json' in content_type:
            assert json_data is None
            json_data = json.dumps(data, encoding=encoding)
        c = Client(wsgi, web.Response)
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

    handler = web.handler(api.registry)
    wsgi = web.wsgi_wrapper(handle_request, factory=TestContext)
    wsgi.call = call
    return wsgi


def test_notallowed(testapi):
    rsp = testapi.call('notallowed')
    assert rsp.status_code == 403
    assert rsp.json == {'error': {'message': 'Not allowed'}}

def test_badallow(testapi):
    rsp = testapi.call('badallow')
    assert rsp.status_code == 500
    assert rsp.json == {'error': {'message': 'Internal server error'}}

def test_notfound(testapi):
    rsp = testapi.call('foo')
    assert rsp.status_code == 404
    assert rsp.json == {'error': {'message': 'Not found'}}

def test_bad_json(testapi):
    arg = 'not json'
    rsp = testapi.call('concat', json_data=arg)
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

def test_validate_missing(testapi):
    rsp = testapi.call('concat', {})
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

def test_validate_badarg(testapi):
    rsp = testapi.call('addDate', {'d':1, 'i': 'x'})
    assert rsp.status_code == 400
    assert rsp.json == {'error': {'message': 'Bad request'}}

def test_bad_response(testapi):
    rsp = testapi.call('badResponse')
    assert rsp.status_code == 500
    assert rsp.json == {'error': {'message': 'Internal server error'}}

def test_validate_exception(testapi):
    rsp = testapi.call('throws')
    assert rsp.status_code == 500
    assert rsp.json == {'error': {'message': 'Internal server error'}}

def test_empty(testapi):
    rsp = testapi.call('empty')
    assert rsp.status_code == 200
    assert rsp.json == {'result': None}

def test_context(testapi):
    testapi.call('empty')
    assert isinstance(testapi.request.context, TestContext)

def test_not_json(testapi):
    rsp = testapi.call('empty', 'not json', content_type='text/plain')
    assert rsp.status_code == 200
    assert rsp.json == {'result': None}

def test_dates(testapi):
    args = {'d': '2001-01-01', 'i': 2}
    rsp = testapi.call('addDate', args)
    assert rsp.status_code == 200
    expect = '2001-01-03'
    assert rsp.json == {'result': expect}

def test_datetime(testapi):
    arg = {'d': '2001-01-01 11:11:01'}
    rsp = testapi.call('datetime', arg)
    assert rsp.status_code == 200
    expect = '11:11:01'
    assert rsp.json == {'result': expect}

def test_strings(testapi):
    args = {'s': 'foo', 'u': 'bar'}
    rsp = testapi.call('concat', args)
    assert rsp.status_code == 200
    assert rsp.json == {'result': 'foobar'}

def test_uuid(testapi):
    arg = {'u': SAMPLE_UUID}
    rsp = testapi.call('uuidTest', arg)
    assert rsp.status_code == 200
    assert rsp.json == {'result': SAMPLE_UUID}

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

def test_convert_object(testapi):
    arg = {'x': {'a': 1, 'b': 2}}
    rsp = testapi.call('obj', arg)
    assert rsp.status_code == 200
    assert rsp.json == {'result': [1, 2]}

def test_convert_list(testapi):
    arg = {'l': [1, 2]}
    rsp = testapi.call('listTest', arg)
    assert rsp.status_code == 200
    assert rsp.json == {'result': [1, 2, 3, 4]}

def test_convert_dict(testapi):
    arg = {'d': {1: SAMPLE_UUID}}
    rsp = testapi.call('dictTest', arg)
    assert rsp.status_code == 200
    assert rsp.json == {'result': {'2': SAMPLE_UUID}}


