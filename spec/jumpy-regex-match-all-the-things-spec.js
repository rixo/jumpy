'use babel'

import {build} from '../lib/util/regex-match-all-the-things'
import fs from 'fs'

const formatResult = (resultAsString, expected, result, code) => `
   found: ${resultAsString}
    diff: ${result.replace(/_/g, ' ').replace(/x/g, '-').replace(/!/g, '+')}
expected: ${expected}
          ${code}
`

const loadTests = () => {
  const txtFilename = `${__dirname}/fixtures/regex-match-all-the-things.txt`
  const txt = fs.readFileSync(txtFilename, 'utf8')
  const lines = txt.split('\n')
  const readNextLine = () => {
    while (lines.length) {
      const line = lines.shift()
      if (line[0] !== '#') {
        return line
      }
    }
  }
  const crossOptions = [
    {lessMatch: true, snakeMatchSeparator: true},
    {lessMatch: true, snakeMatchSeparator: false},
    {lessMatch: false, snakeMatchSeparator: true},
    {lessMatch: false, snakeMatchSeparator: false},
  ]
  const tests = []
  while (lines.length) {
    const line = readNextLine()
    const match = /^>\s*(.*)$/.exec(line)
    if (match) {
      const title = `matches ${match[1]}`
      let nextLine = readNextLine()
      const testLines = []
      while (nextLine) {
        if (nextLine) {
          testLines.push(nextLine)
        }
        nextLine = readNextLine()
      }
      const code = testLines.pop()
      if (testLines.length > 1) {
        testLines.forEach(spec => {
          let skip = false
          let focus = false
          if (spec[0] === 'x') {
            spec = spec.substr(1)
            skip = true
          } else if (spec[0] === 'f') {
            spec = spec.substr(1)
            focus = true
          }
          const expected = spec.substr(0, code.length)
          const optionsSpec = spec.substr(code.length).trim()
          let options = {}
          if (optionsSpec[0] === '-') {
            options = {[optionsSpec.substr(1)]: false}
          } else if (optionsSpec[0] === '+') {
            options = {[optionsSpec.substr(1)]: true}
          } else {
            options = eval(`(${optionsSpec})`)
          }
          const test = {
            skip,
            focus,
            title: `${title} ${optionsSpec}`,
            code,
            expected,
            options,
          }
          tests.push(test)
        })
      } else {
        const expected = testLines.shift()
        const test = {title, code, expected}
        crossOptions.forEach(options => {
          const title = `${test.title} ${JSON.stringify(options)}`
          tests.push({...test, title, options})
        })
      }
    }
  }
  return tests
}

describe('jumpy match all-the-things regex', () => {
  let jumpy

  const getLabelsAsString = (code, labels) => {
    const chars = Array.from(Array(code.length)).map(() => ' ')
    labels.forEach(({column: i}) => chars[i] = '_')
    return chars.join('')
  }

  const getData = () => jumpy.core.getStateMachine().data

  const toggle = () => {
    const workspace = atom.views.getView(atom.workspace)
    return Promise.all([
      atom.packages.activatePackage('jumpy'),
      atom.commands.dispatch(workspace, 'jumpy:toggle'),
    ]).then(() => {
      const pack = atom.packages.getActivePackage('jumpy')
      jumpy = pack.mainModule
    })
  }

  const expectMatches = ({code, expected, options}) => async () => {
    const editor = atom.workspace.getActiveTextEditor()
    const {element} = editor
    editor.setText(code + "\n")

    if (options) {
      const regex = build(options)
      const s = String(regex)
      const pattern = s.substring(s.indexOf('/') + 1, s.lastIndexOf('/'))
      atom.config.set('jumpy.useBuiltInRegexMatchAllTheThings', false)
      atom.config.set('jumpy.matchPattern', pattern)
    } else {
      atom.config.set('jumpy.useBuiltInRegexMatchAllTheThings', true)
      atom.config.set('jumpy.matchPattern', '.')
    }

    await toggle()
    const {visibleLabels} = getData()

    const resultChars = Array.from(expected)
    const missing = resultChars.map(c => c === '_')
    visibleLabels.forEach(({column}) => {
      if (expected[column] === '_') {
        missing[column] = false
      } else {
        resultChars[column] = '!'
      }
    })
    missing
      .map((x, i) => x === true ? i : false)
      .filter(x => x !== false)
      .forEach(i => resultChars[i] = 'x')
    const resultAsString = getLabelsAsString(code, visibleLabels)
    if (resultAsString !== expected) {
      fail(formatResult(resultAsString, expected, resultChars.join(''), code))
    }
  }

  beforeEach(() => {
    const workspaceElement = atom.views.getView(atom.workspace)
    workspaceElement.style.height = '5000px'
    workspaceElement.style.width = '5000px'

    jasmine.attachToDOM(workspaceElement)

    atom.packages.loadPackage('jumpy')

    return atom.workspace.open()
  })

  const tests = loadTests()
  tests.forEach(test => {
    if (test.skip) {
      it(test.title)
    } else {
      const fn = test.focus ? ffit : it
      fn(test.title, expectMatches(test))
    }
  })
})
