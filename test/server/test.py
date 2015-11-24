from __future__ import absolute_import
__metaclass__ = type

import pytest

from carenetng import core
from carenetng import login
# from carenetng import crowd


@pytest.fixture()
def cx():
    cx = core.context()
    cx.authenticate = _authenticate
    return cx


def _authenticate(u, p):
    test_users = {
        'test-user': 'test password',
        'test-user-2': 'test password 2',
    }
    pw = test_users.get(u)
    return pw and pw == p or False




def test_login_rejects_invalid_user(cx):
    with pytest.raises(login.LoginFailed):
        r = login.login(cx, 'invalid', 'invalid')
        assert r is None


def test_login_rejects_invalid_password(cx):
    with pytest.raises(login.LoginFailed):
        r = login.login(cx, 'test-user', 'invalid')
        assert r is None


def test_login_accepts_valid_user(cx):
    r = login.login(cx, 'test-user', 'test password')
    assert r is True


def test_login_accepts_second_valid_user(cx):
    r = login.login(cx, 'test-user-2', 'test password 2')
    assert r is True


