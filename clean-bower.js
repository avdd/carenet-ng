#!/usr/bin/env node

var filename = process.cwd() + '/bower.json';
var data = require(filename);
delete data.resolutions;
var json = JSON.stringify(data, null, 2);
require('fs').writeFileSync(filename, json + '\n');

