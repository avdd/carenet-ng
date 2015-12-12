from __future__ import absolute_import
__metaclass__ = type

import pytest
import mock

from carenetng import core
from carenetng import login
from carenetng import auth


@pytest.fixture()
def cx():
    cx = core.context({'testing': True})
    return cx


class mock_context:
    def verify(self, a, b):
        return a == b


class mock_repository(auth.Repository):
    def __init__(self, user):
        self.user = user
        self.passlib_context = mock_context()
    def get_user(self, _):
        return self.user


def test_auth_query():
    db = mock.Mock()
    repo = auth.Repository(db)
    u = repo.get_user('test')
    db.query.assert_called_once_with(auth.User)


def test_auth_no_user():
    repo = mock_repository(None)
    with pytest.raises(auth.NoUser):
        repo.authenticate(None, None)


def test_auth_no_credential():
    u = auth.User()
    repo = mock_repository(u)
    with pytest.raises(auth.BadUser):
        repo.authenticate(None, None)


def test_auth_not_active():
    u = auth.User()
    u.enabled = False
    repo = mock_repository(u)
    with pytest.raises(auth.BadUser):
        repo.authenticate(None, None)


def test_auth_password_unset():
    u = auth.User()
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(auth.BadUser):
        repo.authenticate(None, None)


def test_auth_empty_password():
    u = auth.User()
    u.passhash = 'non-empty'
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(auth.BadPassword):
        repo.authenticate(None, None)


def test_auth_wrong_password():
    u = auth.User()
    u.passhash = 'password'
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(auth.BadPassword):
        repo.authenticate(None, 'incorrect')


def test_auth_bad_data():
    u = auth.User()
    class raises:
        def verify(*x):
            raise ValueError
    u.passhash = 'malformed'
    u.enabled = True
    repo = mock_repository(u)
    repo.passlib_context = raises()
    with pytest.raises(auth.BadPassword):
        repo.authenticate(None, 'whatever')


def test_auth_good_password():
    u = auth.User()
    u.passhash = 'good password'
    u.enabled = True
    repo = mock_repository(u)
    result = repo.authenticate(None, 'good password')
    assert result is u


def test_auth_unicode_password():
    u = auth.User()
    password = u'\N{SNOWMAN}password'
    u.passhash = password
    u.enabled = True
    repo = mock_repository(u)
    result = repo.authenticate(None, password)
    assert result is u


def test_auth_exception_str():
    e = auth.BadUser('foo')
    assert str(e) == 'BadUser: foo'


def test_login_rejects_invalid(cx):
    cx.get_auth_repo = lambda:mock_repository(None)
    r = login.login(cx, 'invalid', 'invalid')
    assert not r


def test_login_accepts_valid(cx):
    test_user = auth.User()
    test_user.enabled
    u = auth.User()
    u.passhash = 'good password'
    u.enabled = True
    cx.get_auth_repo = lambda:mock_repository(u)
    r = login.login(cx, 'test-user', 'good password')
    assert r is True


