/*jshint esversion: 6 */
/**
 * Look in ./config folder for webpack.dev.js
 * @author: @AngularClass
 */

global.__basedir = __dirname;

switch (process.env.webpackenv.trim()) {
  case 'front':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.front');
    /** module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.front'); */
    /**   module.exports = require('./src/config/webpack.front'); */
    break;
  case 'front-local':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.front-local');
    break;
  case 'node-local':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.node-local');
    break;
  case 'node-test':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.node-test');
    break;
  case 'node':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.node');
    break;
  case 'server':
    module.exports = require('@mydiem/diem-util/lib/webpack5/webpack.server');
    break;
  default:
}