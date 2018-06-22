'use strict'

const {createRunner} = require('atom-jasmine3-test-runner')

const options = {
  legacySuffix: 'skip-them-for-now',
  specHelper: {
    atom: true,
    attachToDom: true,
    customMatchers: true,
    jasmineFocused: true,
  },
  timeReporter: true,
}

module.exports = createRunner(options)
