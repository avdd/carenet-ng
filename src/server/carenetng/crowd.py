from __future__ import absolute_import
__metaclass__ = type

import os
import hashlib
import datetime
import pytz

from sqlalchemy import (
    Column,
    CHAR,
    Integer,
    String,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint
)

from sqlalchemy.orm import sessionmaker, relationship, joinedload
from sqlalchemy.orm.collections import column_mapped_collection
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declarative_base


CRED_PREFIX = '{SSHA}'
NONCELEN = 8
MACLEN = 20


Entity = declarative_base()


class Repository:
    def __init__(self, db):
        self.db = db

    def get_user(self, username):
        return (self.db.query(User)
                .options(joinedload(User._attrs))
                .options(joinedload(User._memberships))
                .filter_by(lower_user_name = username.lower())
                .first())

    def authenticate(self, username, password):
        u = self.get_user(username)
        if not u:
            raise NoUser
        if u.authenticate(password):
            return u


def newhash(secret):
    return _mkhash(secret, os.urandom(NONCELEN))


def cmphash(clearpass, refhash):
    nonce = refhash.decode('base64')[MACLEN:]
    hashed = _mkhash(clearpass, nonce)
    fmt = '%%-%ds' % len(refhash)
    hashed = fmt % hashed
    return len(hashed) == len(refhash) and hashed == refhash


def _mkhash(secret, nonce):
    if isinstance(secret, unicode):
        secret = secret.encode('UTF-8')
    sha1 = hashlib.sha1(secret + nonce).digest()
    return (sha1 + nonce).encode('base64').strip()


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


class Attr(Entity):
    __tablename__ = 'cwd_user_attribute'
    user_id = Column(Integer,
                     ForeignKey('cwd_user.id'),
                     primary_key=True)
    attribute_name = Column(String, primary_key=True)
    attribute_value = Column(String)


class Membership(Entity):
    __tablename__ = 'cwd_membership'
    lower_parent_name = Column(String, primary_key=True)
    lower_child_name = Column(String,
                              ForeignKey('cwd_user.lower_user_name'),
                              primary_key=True)


class User(Entity):

    __tablename__ = 'cwd_user'

    id = Column(Integer, primary_key=True)
    lower_user_name = Column(String)
    active = Column(CHAR(1))
    first_name = Column(String)
    last_name = Column(String)
    email_address = Column(String)
    credential = Column(String)

    username = property(lambda x:x.lower_user_name)

    _attr_class = column_mapped_collection(Attr.attribute_name)
    _attrs = relationship(Attr, collection_class=_attr_class)
    attributes = association_proxy('_attrs', 'attribute_value')
    del _attr_class

    _memberships = relationship(Membership, collection_class=set)
    groups = association_proxy('_memberships', 'lower_parent_name')

    @property
    def password_stamp(self):
        stamp = self.attributes.get('passwordLastChanged')
        if stamp:
            ts = int(stamp)/1000.0
            return datetime.datetime.fromtimestamp(ts, pytz.UTC)

    def authenticate(self, clearpass):
        if not self.credential:
            raise BadUser
        if self.active != 'T':
            raise BadUser
        if not self.compare_credential(clearpass):
            raise BadPassword
        return True

    def compare_credential(self, clearpass):
        if self.credential and clearpass:
            hashpass = self.credential[len(CRED_PREFIX):]
            return cmphash(clearpass, hashpass)
        return False


