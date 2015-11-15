
import pytest
from carenetng.app import app

# from carenetng import crowd


TEST_USERS = {
    'test-user': 'test password',
    'test-user-2': 'test password 2',
}


@pytest.fixture(autouse=True)
def test_setup():
    app.authenticate = _authenticate


def _authenticate(cx, u, p):
    pw = TEST_USERS.get(u)
    return pw and pw == p or False


def test_login_rejects_invalid():
    rv = app.client().send('login', {})
    assert rv.json
    assert 'error' in rv.json
    assert 'result' not in rv.json


def test_login_rejects_invalid_user():
    rv = app.client().send('login', {'username': 'nope'})
    assert rv.json
    assert 'error' in rv.json
    assert 'result' not in rv.json


def test_login_rejects_invalid_password():
    args = {'username': 'test-user',
            'password': 'wrong password'}
    rv = app.client().send('login', args)
    assert rv.json
    assert 'error' in rv.json
    assert 'result' not in rv.json


def test_login_accepts_valid_user():
    args = {'username': 'test-user',
            'password': 'test password'}
    rv = app.client().send('login', args)
    assert 'result' in rv.json
    assert rv.json['result']


def test_login_accepts_second_valid_user():
    args = {'username': 'test-user-2',
            'password': 'test password 2'}
    rv = app.client().send('login', args)
    assert 'result' in rv.json
    assert rv.json['result']


