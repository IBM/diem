/*jshint esversion: 6 */
/**
 * Look in ./config folder for webpack.dev.js
 * @author: @AngularClass
 */

global.__basedir = __dirname;

switch (process.env.webpackenv.trim()) {
  case 'front':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.front`);
    /** module.exports = require('./src/webpack/webpack.front'); */
    /**   module.exports = require('./src/config/webpack.front'); */
    break;
  case 'front-local':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.front-local`);
    break;
  case 'node-test':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.node-test`);
    break;
  case 'node':
    module.exports = require(`${global.__basedir}/src/webpack/lib/webpack.node`);
    break;
  default:
}