// ATTENTION if you're messing with that: components order
// is somewhat important!
//
// We want to match:
//
// _   _ _  _     __   __ _ _ __    __  _      _  _ _   _ __ _ _ _   _ _ _
// snake_case     |----+--||--||    |---|      aaaa +++++ at_the_endof_the
//
// _   _ _  _     __   __ _ _ __    __  _      _  _ _   _ __ _ _ _   _ _ _
// snake_case     |____+__||__||    |___|      aaaa +++++ at_the_endof_the
//
// _  _   _ _  _ _ _ _  _   _   _  _  _    __ _  _ lessMatch (not implemented)
// __ _   _ _  _ _ _ _  _   _   _  __ _    __ _  _
// da-kebab-case-too andAlsoCamel  OF_COURSE! ----
//
//            X Failure lessMatch
// _ ___ __ ___ __ _  _ ___ __ ___ __ _
// ##-#--#- #-- #---  ##_#__#_ #__ #___
//
// _  _   _  _  _   _  _    _ _  ___   _ _   lessMatch === true
// __ __  __ _  _   __ _    _ __ ___   _ _   lessMatch === false
// ++ --  // ////   /* /****/ */ #-####--#
// __ __  __ _  _   __ _    _ __ ___   _ _   lessMatch === false
// ++ --  // ////   /* /****/ */ #_####--#
//
// _  _  _  _  _     _  _  _   _
// __ __ __ __ __    _  _  _   _
// -> => <= <- !!    ++++  *****
//
const {escapeRegExp} = require('underscore-plus')
const modifiers = 'g'
const gregariousSpecialChars = '!|&?.@+*%=$#^/'
const associableSpecialChars = '"\'`{}<>()[]/'
const lessMatch = false
// const lessMatch = true
const lessMatch1 = [
  "->", "<-", "=>",
  '\\*/', '//(?!/)',
  '!!',
  "[=!]?={1,2}", // == != === !==
  "[<>]=?", // < <= >= >
  // ++ -- **  FAILURE HERE (detects #-- and misses the 2nd match)
  "\\*\\*(?=$|\\s)",
  "\\+\\+(?=$|\\s)",
  "\\-\\-(?=$|\\s)",
  "/\\*(?=$|\\s)",
  "[.]{3}", // ...
]
const regex = new RegExp([
  // well known sequences to be considered a single unit
  ...(lessMatch ? lessMatch1 : [
    '-(?=>)',
    '<(?=-)',
  ]),
  '/\\*{2,}',
  // special chars that we want to match as units when
  // repeated (i.e. a single match for repeating same char)
  // "[!|&?.@\\-=$\\^/]+",
  Array.from(gregariousSpecialChars)
    .map(escapeRegExp)
    .map(c => `(?:${c}(?!\\s|$))+`)
    .join('|'),
  '(?:[-_](?!\\s|$)){2,}',
  // special chars that we want to match every single one
  `[${escapeRegExp(associableSpecialChars)}]`,
  // end of word
  "(?!-)\\S\\b\\s*",
  "\\S\\s+",
  // start of word
  "(?:\\b|^)(?!-)[\\S]",
  // end of line
  ".$",
  // camel bumps
  "[A-Z](?![A-Z])",
  // snake & kebab case (1): char before hyphen
  "\\S(?=[-_])",
  // snake & kebab case (2): char after hyphen -- actually this
  // one would require a positive lookbehind, but it does not
  // seem supported in Electron yet (support has just been added
  // in recent Chrome). So we're using adjustPosition paliative.
  // "[-_]\\S",
  "(_\\S)",
  // empty lines
  "^s*$",
  // remaining isolated hyphens
  '-(?=\\W)',
].join('|'), modifiers)

const isSnakeMatch = match =>
  !!match[1] // snake char after is the only _capturing_ group...
  && match[0].length === 2
  && !['_', ' '].some(c => c === match[0][1])

const adjustPosition = (match, label) => {
  if (isSnakeMatch(match)) {
    label.column++
  }
  return [label]
}

if (module) {
  module.exports = {regex, adjustPosition}
}

({regex, adjustPosition})
