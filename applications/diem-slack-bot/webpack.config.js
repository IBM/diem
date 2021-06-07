/*jshint esversion: 6 */
/**
 * Look in ./config folder for webpack.dev.js
 * @author: @AngularClass
 */

global.__basedir = __dirname;

switch (process.env.webpackenv.trim()) {
  case 'node-local':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.node-local`);
    break;
  case 'node-test':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.node-test`);
    break;
  case 'node':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.node`);
    break;
  case 'server':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.server`);
    break;
  default:
}