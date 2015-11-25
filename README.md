
[![build status](https://travis-ci.org/avdd/carenet-ng.svg?branch=master)](https://travis-ci.org/avdd/carenet-ng)

# Requirements

- git
- node (4.x)
- python (2.7)
- virtualenv
- rsync
- ssh
- python headers
- openldap headers
- pgsql headers
- virtualbox
- vagrant
- the vagrant box `ubuntu804-python27-carenet`
- firefox or chrome for automated testing
- an otherwise standard unixy environment


# Getting started

Run `./build.sh setup` which does, roughly, this:

- mkdir .cache
- npm install
- npm run bower install
- virtualenv .cache/python
- pip wheel -f .cache/wheelhouse -w .cache/wheelhouse -r python-requires.txt
- pip install -f .cache/wheelhouse -r python-requires.txt
- (cd src/server && pip install -e .)

Then you can `./gulp test`

