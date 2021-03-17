#!/usr/bin/env node
/* eslint-env node */
'use strict';

var program = require('commander');
var fixer = require('../lib/fixer.js');

program
  .version(
    'version    : ' + require("../package.json").version
  )
  .option('-s, --src-path [path]', 'path where .pug files are located. Searched recursivly.', 'src')
  .option('-l, --local-scope', 'Add a filename based _ngcontent attribute to all tags. See "local-scoped-scss-with-pug-loader" package.', false)
  .parse(process.argv);

fixer({
  srcPath: program._optionValues.srcPath,
  localScope: program._optionValues.localScope
});
