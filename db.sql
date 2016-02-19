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

-- devel:password
COPY sync_user (username, passhash, first_name, last_name, email_address, enabled, password_stamp) FROM stdin;
devel	$2a$12$a5I9W6WlMHcLpKL8JVNl2OahH8Xkh3HtUxjlv/zBKb3vTSwRP6gQi	Devel	Only	devel@localhost	true	2015-12-12 19:33:06.661506+0
\.


COPY sync_user_group_assoc (username, groupname) FROM stdin;
devel	medical-database
devel	medical-database-editor-cf
devel	medical-database-editor-hne
\.


