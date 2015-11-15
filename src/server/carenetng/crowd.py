# forward-compat boilerplate
from __future__ import absolute_import
__metaclass__ = type

import os
import hashlib
import datetime

from sqlalchemy import (
    Column,
    CHAR,
    Integer,
    String,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint
)

from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.orm.collections import column_mapped_collection
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declarative_base


CRED_PREFIX = '{SSHA}'
NONCELEN = 8
MACLEN = 20


Entity = declarative_base()


def get_authenticated_user(db, username, password):
    u = (db.query(User)
         .filter_by(lower_user_name = username.lower())
         .first())
    if not u:
        raise NoUser
    if not u.authenticate(password):
        raise LoginFailed
    return u


def mkhash(secret, nonce=None):
    if nonce is None:
        nonce = os.urandom(NONCELEN)
    if isinstance(secret, unicode):
        secret = secret.encode('UTF-8')
    sha1 = hashlib.sha1(secret + nonce).digest()
    return (sha1 + nonce).encode('base64').strip()


def _cmphash(clearpass, refhash):
    nonce = refhash.decode('base64')[MACLEN:]
    hashed = mkhash(clearpass, nonce)
    fmt = '%%-%ds' % len(refhash)
    hashed = fmt % hashed
    return len(hashed) == len(refhash) and hashed == refhash


class SecurityException(Exception): pass
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

    def __repr__(self):
        return 'crowd.Membership<%s, %s>' % (self.lower_child_name,
                                             self.lower_parent_name)


class User(Entity):
    tz = None

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

    def __repr__(self):
        return 'crowd.User<%s>' % self.lower_user_name

    @property
    def password_stamp(self):
        stamp = self.attributes.get('passwordLastChanged')
        if stamp:
            ts = int(stamp)/1000.0
            return datetime.datetime.fromtimestamp(ts, self.tz)

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
            return _cmphash(clearpass, hashpass)
        return False


