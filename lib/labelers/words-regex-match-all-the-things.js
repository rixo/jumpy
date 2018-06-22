const {escapeRegExp} = require('underscore-plus')
const modifiers = 'g'
const gregariousSpecialChars = '!|&?.@+*%=$#^/'
const associableSpecialChars = '"\'`{}<>()[]/'
const lessMatchParts = [
  "->", "<-", "=>",
  '\\*/', '//(?!/)',
  '!!',
  "[=!]?={1,2}", // == != === !==
  "[<>]=?", // < <= >= >
  // these ones are very hard without lookbehind, and lessMatch is
  // not so high priority...
  // // ++ -- **
  // "\\*\\*(?=$|\\s)",
  // "\\+\\+(?=$|\\s)",
  // "\\-\\-(?=$|\\s)",
  // /*
  "/\\*(?=$|\\s)",
  "[.]{3}", // ...
]
const noLessMatchParts = [
  '-(?=>)',
  '<(?=-)',
]
// ATTENTION if you're messing with that: components order
// is somewhat important!
//
const build = ({
  lessMatch = false,
  snakeMatchSeparator = true,
} = {}) => new RegExp([
  // well known sequences to be considered a single unit
  ...(lessMatch ? lessMatchParts : noLessMatchParts),
  '/\\*{2,}',
  // special chars that we want to match as units when
  // repeated (i.e. a single match for repeating same char)
  Array.from(gregariousSpecialChars)
    .concat(snakeMatchSeparator ? ['_-'] : [])
    .map(escapeRegExp)
    .map(c => `${c}+(?!\\s|$)`)
    .join('|'),
  '(?:[-_](?!\\s|$)){2,}',
  // special chars that we want to match every single one
  `[${escapeRegExp(associableSpecialChars)}]`,
  // snake & kebab (mode 1)
  ...(snakeMatchSeparator ? [
    "[a-z]+(?=[_-])",
    "[A-Z]+(?=[_-])",
    "[0-9]+(?=[_-])",
    "[_-]+(?!\\s|$)",
    // camel bumps
    "[A-Z][a-z]+(?!\\b|\\s)",
  ] : [
    "[a-z]+(?=[a-z][_-])",
    "[A-Z]+(?=[A-Z][_-])",
    "[0-9]+(?=[0-9][_-])",
    "[a-z]+[_-]",
    "[A-Z]+[_-]",
    "[0-9]+[_-]",
    // camel bumps
    "[A-Z][a-z]+(?!\\b|\\s|[_-])",
  ]),
  // camel bumps
  "[a-z]+(?!\\b|\\s)",
  "[A-Z]+(?!\\b|\\s)",
  "[0-9]+(?!\\b|\\s)",
  // end of word
  "\\S\\b\\s*",
  "\\S\\s+",
  // start of word
  "(?:\\b|^)[\\S]",
  // end of line
  ".$",
  // empty lines
  "^\\s*$",
  // remaining isolated hyphens
  '-(?=\\W)',
].join('|'), modifiers)

const regex = build()
const adjustPosition = false

if (module) {
  module.exports = {build, regex, adjustPosition}
}

({regex, adjustPosition})
