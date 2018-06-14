'use strict'

const {createRunner} = require('atom-jasmine3-test-runner')

const options = {
  specHelper: {
    atom: true,
    attachToDom: true,
    customMatchers: true,
    jasmineFocused: true,
  },
  timeReporter: true,
}

module.exports = createRunner(options)
