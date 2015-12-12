from __future__ import absolute_import
__metaclass__ = type

import os
import pytz
import datetime

from sqlalchemy import (
    Column,
    Boolean,
    Integer,
    String,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint
)

from sqlalchemy.orm import sessionmaker, relationship, joinedload
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declarative_base

from passlib.context import CryptContext

PASSLIB_SCHEMES = ['bcrypt']
PASSLIB_DEFAULT = 'bcrypt'

Entity = declarative_base()


class Repository:
    def __init__(self, db):
        self.db = db
        self.passlib_context = CryptContext(schemes=PASSLIB_SCHEMES,
                                            default=PASSLIB_DEFAULT,
                                            deprecated=['auto'])


    def get_user(self, username):
        return (self.db.query(User)
                .options(joinedload(User._memberships))
                .filter_by(username = username.lower())
                .first())

    def authenticate(self, username, clearpass):
        u = self.get_user(username)
        if not u:
            raise NoUser
        if not u.enabled:
            raise BadUser
        if not u.passhash:
            raise BadUser
        if not clearpass:
            raise BadPassword
        if not self.verify_hash(clearpass, u.passhash):
            raise BadPassword
        return u

    def verify_hash(self, clearpass, passhash):
        try:
            return self.passlib_context.verify(clearpass, passhash)
        except ValueError:
            pass
        return False


class SecurityException(Exception):
    def __str__(self):
        msg = self.__class__.__name__
        if self.args:
            msg += ': ' + str(self.args[0])
        return msg


class LoginFailed(SecurityException): pass
class NoUser(LoginFailed): pass
class BadUser(LoginFailed): pass
class BadPassword(LoginFailed): pass


class Membership(Entity):
    __tablename__ = 'sync_user_group_assoc'
    groupname = Column(String, primary_key=True)
    username = Column(String,
                      ForeignKey('sync_user.username'),
                      primary_key=True)


class User(Entity):

    __tablename__ = 'sync_user'

    username = Column(String, primary_key=True)
    passhash = Column(String)
    enabled = Column(Boolean)
    first_name = Column(String)
    last_name = Column(String)
    email_address = Column(String)
    password_stamp = Column(DateTime(timezone=True))

    _memberships = relationship(Membership, collection_class=set)
    groups = association_proxy('_memberships', 'groupname')


