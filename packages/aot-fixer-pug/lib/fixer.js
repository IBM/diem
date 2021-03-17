/* eslint-env node */
'use strict';

var fs = require('fs');
var path = require('path');

var lex = require('pug-lexer');
var parse = require('pug-parser');
var wrap = require('pug-runtime/wrap');
var generateCode = require('pug-code-gen');
var walk = require('pug-walk');
var hash = require("shorthash");

var glob = require("glob");

// Generate a string of HTML from a pug file's content
var pugToHtml = function (pugSource, fileName, localScope) {
  var pugAst = parse(lex(pugSource));

  if (localScope) {
    var resPath = path.parse(path.resolve(fileName));
    var srcFilename = path.join(resPath.dir, resPath.name);
    var uniq = "_ngcontent-" + hash.unique(srcFilename);

    // add unique _ngcontent attribute to make it compatible with https://github.com/thenoseman/local-scoped-scss-with-pug-loader
    walk(pugAst, function (node) {
      if (node.type === 'Tag') {
        node.attrs.push({ name: uniq, val: "1", mustEscape: false });
      }
    }, {
        includeDependencies: false
      });
  }

  var funcStr = generateCode(pugAst, {
    compileDebug: false,
    pretty: false,
    inlineRuntimeFunctions: false,
    templateName: 'pugTpl'
  });

  var func = wrap(funcStr, 'pugTpl');
  return func();
};

var fixer = function (options) {
  glob(options.srcPath + "/**/*.pug", {}, function (err, files) {
    files.forEach(function (fileName) {
      var pugContent = pugToHtml(fs.readFileSync(fileName, {
        encoding: 'utf8'
      }), fileName, options.localScope);
      var fileContent = "export const tmpl: string = `" + pugContent + "`;\n";
      fs.writeFileSync(fileName + ".tmpl.ts", fileContent);
    });
  });
};

module.exports = fixer;

