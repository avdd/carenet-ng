-- vim: noet ts=8 :
CREATE TABLE cwd_membership (
    lower_parent_name varchar NOT NULL,
    lower_child_name varchar NOT NULL
);

CREATE TABLE cwd_user (
    id integer,
    lower_user_name varchar NOT NULL,
    active char(1) NOT NULL,
    first_name varchar,
    last_name varchar,
    email_address varchar,
    credential varchar
);

CREATE TABLE cwd_user_attribute (
    user_id bigint NOT NULL,
    attribute_name varchar NOT NULL,
    attribute_value varchar
);


-- devel-only:password
COPY cwd_user (id, lower_user_name, active, first_name, last_name, email_address, credential) FROM stdin;
666	devel-only	T	devel	only	devel@localhost	{SSHA}lKJ1tXPNLw14YdQvJwCCY0Ubl3GUhYJV47morw==
\.


COPY cwd_membership (lower_child_name, lower_parent_name) FROM stdin;
devel-only	medical-database
devel-only	medical-database-editor-cf
devel-only	medical-database-editor-hne
\.

COPY cwd_user_attribute (user_id, attribute_name, attribute_value) FROM stdin;
666	passwordLastChanged	0
\.


