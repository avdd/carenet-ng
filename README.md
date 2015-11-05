
# Getting started

Run `./build.sh setup` which does, roughly, this:

- mkdir .cache
- npm install
- npm run bower install
- virtualenv .cache/python
- pip wheel -w .cache/wheelhouse github:/avdd/flak/
- pip wheel -f .cache/wheelhouse -w .cache/wheelhouse -r pyreq-devel.txt
- pip install -f .cache/wheelhouse -r pyreq-devel.txt
- (cd src/server && pip install -e .)

Then you can `./gulp test`

