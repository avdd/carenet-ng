#!/usr/bin/env node

var re = /registry\.npmjs\.org/;
var filename = process.cwd() + '/npm-shrinkwrap.json';
var data = require(filename);
clean(data);
var json = JSON.stringify(data, null, 2);
require('fs').writeFileSync(filename, json + '\n');

function clean(obj) {
  delete obj.from;
  if (obj.resolved && re.test(obj.resolved))
    delete obj.resolved;
  var deps = obj.dependencies
  if (deps)
    Object.keys(deps).forEach(function (k) {
        clean(deps[k]);
    });
}

