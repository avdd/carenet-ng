-- vim: noet ts=8 :
CREATE TABLE sync_user_group_assoc (
    username VARCHAR NOT NULL,
    groupname VARCHAR NOT NULL
);


CREATE TABLE sync_user (
    username VARCHAR NOT NULL,
    passhash VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    email_address VARCHAR,
    enabled BOOLEAN NOT NULL,
    password_stamp TIMESTAMP WITH TIME ZONE
);

-- devel-only:password
COPY sync_user (username, passhash, first_name, last_name, email_address, enabled, password_stamp) FROM stdin;
devel-only	$2a$12$a5I9W6WlMHcLpKL8JVNl2OahH8Xkh3HtUxjlv/zBKb3vTSwRP6gQi	devel	only	devel@localhost	true	2015-12-12 19:33:06.661506+0
\.


COPY sync_user_group_assoc (username, groupname) FROM stdin;
devel-only	medical-database
devel-only	medical-database-editor-cf
devel-only	medical-database-editor-hne
\.


