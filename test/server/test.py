from __future__ import absolute_import
__metaclass__ = type

import pytest
import mock

from carenetng import core
from carenetng import login
from carenetng import crowd


@pytest.fixture()
def cx():
    cx = core.context({'testing': True})
    return cx


class mock_context:
    def verify(self, a, b):
        return a == b


class mock_repository(crowd.Repository):
    def __init__(self, user):
        self.user = user
        self.passlib_context = mock_context()
    def get_user(self, _):
        return self.user


def test_crowd_query():
    db = mock.Mock()
    repo = crowd.Repository(db)
    u = repo.get_user('test')
    db.query.assert_called_once_with(crowd.User)


def test_crowd_no_user():
    repo = mock_repository(None)
    with pytest.raises(crowd.NoUser):
        repo.authenticate(None, None)


def test_crowd_no_credential():
    u = crowd.User()
    repo = mock_repository(u)
    with pytest.raises(crowd.BadUser):
        repo.authenticate(None, None)


def test_crowd_not_active():
    u = crowd.User()
    u.enabled = False
    repo = mock_repository(u)
    with pytest.raises(crowd.BadUser):
        repo.authenticate(None, None)


def test_crowd_password_unset():
    u = crowd.User()
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(crowd.BadUser):
        repo.authenticate(None, None)


def test_crowd_empty_password():
    u = crowd.User()
    u.passhash = 'non-empty'
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(crowd.BadPassword):
        repo.authenticate(None, None)


def test_crowd_wrong_password():
    u = crowd.User()
    u.passhash = 'password'
    u.enabled = True
    repo = mock_repository(u)
    with pytest.raises(crowd.BadPassword):
        repo.authenticate(None, 'incorrect')


def test_crowd_bad_data():
    u = crowd.User()
    class raises:
        def verify(*x):
            raise ValueError
    u.passhash = 'malformed'
    u.enabled = True
    repo = mock_repository(u)
    repo.passlib_context = raises()
    with pytest.raises(crowd.BadPassword):
        repo.authenticate(None, 'whatever')


def test_crowd_good_password():
    u = crowd.User()
    u.passhash = 'good password'
    u.enabled = True
    repo = mock_repository(u)
    result = repo.authenticate(None, 'good password')
    assert result is u


def test_crowd_unicode_password():
    u = crowd.User()
    password = u'\N{SNOWMAN}password'
    u.passhash = password
    u.enabled = True
    repo = mock_repository(u)
    result = repo.authenticate(None, password)
    assert result is u


def test_crowd_exception_str():
    e = crowd.BadUser('foo')
    assert str(e) == 'BadUser: foo'


def test_login_rejects_invalid(cx):
    cx.get_crowd_repository = lambda:mock_repository(None)
    r = login.login(cx, 'invalid', 'invalid')
    assert not r


def test_login_accepts_valid(cx):
    test_user = crowd.User()
    test_user.enabled
    u = crowd.User()
    u.passhash = 'good password'
    u.enabled = True
    cx.get_crowd_repository = lambda:mock_repository(u)
    r = login.login(cx, 'test-user', 'good password')
    assert r is True


