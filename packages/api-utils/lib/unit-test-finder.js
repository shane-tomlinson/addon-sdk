/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const file = require("./file");
const packaging = require('@packaging');
const memory = require('api-utils/memory');
const suites = packaging.allTestModules;


const NOT_TESTS = ['setup', 'teardown'];

var TestFinder = exports.TestFinder = function TestFinder(options) {
  memory.track(this);
  this.filter = options.filter;
  this.testInProcess = options.testInProcess === false ? false : true;
  this.testOutOfProcess = options.testOutOfProcess === true ? true : false;
};

TestFinder.prototype = {
  _makeTest: function _makeTest(suite, name, test) {
    function runTest(runner) {
      console.info("executing '" + suite + "." + name + "'");
      test(runner);
    }
    return runTest;
  },

  findTests: function findTests(cb) {
    var self = this;
    var tests = [];
    var filter;
    // A filter string is {fileNameRegex}[:{testNameRegex}] - ie, a colon
    // optionally separates a regex for the test fileName from a regex for the
    // testName.
    if (this.filter) {
      var colonPos = this.filter.indexOf(':');
      var filterFileRegex, filterNameRegex;
      if (colonPos === -1) {
        filterFileRegex = new RegExp(self.filter);
      } else {
        filterFileRegex = new RegExp(self.filter.substr(0, colonPos));
        filterNameRegex = new RegExp(self.filter.substr(colonPos + 1));
      }
      // This function will first be called with just the filename; if
      // it returns true the module will be loaded then the function
      // called again with both the filename and the testname.
      filter = function(filename, testname) {
        return filterFileRegex.test(filename) &&
               ((testname && filterNameRegex) ? filterNameRegex.test(testname)
                                              : true);
      };
    } else
      filter = function() {return true};

    suites.forEach(
      function(suite) {
        var module = require(suite);
        if (self.testInProcess)
          for each (let name in Object.keys(module).sort()) {
            if(NOT_TESTS.indexOf(name) === -1 && filter(suite, name)) {
              tests.push({
                           setup: module.setup,
                           teardown: module.teardown,
                           testFunction: self._makeTest(suite, name, module[name]),
                           name: suite + "." + name
                         });
            }
          }
      });

    cb(tests);
  }
};
