// ATTENTION if you're messing with that: components order
// is somewhat important!
//
// We want to match:
//
// __ _   _ _  _     __   __ _ _ __    __  _      _  _ _   _
// da_snake_case     |----+--||--||    |---|      aaaa +++++
//
// _ __ _ _ __   _ _    ___ __   ___  _      _ __   ____ __ __  __
// 1_22_333 iMatch iMatch() iMatch(arg1, arg2) iMatch(iArg, iArg2)
//
// __    _ ____  ___ __   _    ___ __  _ _  ____
// iMatchToo("text", 'textInside', 'TEXT_HERE');
//
// __ _   _ _  _ _ _ _  _   _   _  __ _    __ _  _ _   _ _ _
// da-kebab-case-too andAlsoCamel  OF_COURSE! some_MIXED_one
//
// __   __ _ _ __    __  _
// |____+__||__||    |___|
//
// _    _  _ _       _ _    _   _    _ _   __ _ _   _ _ _
// innerHTML UPPERCASE InnerHTMLinside time2bed TIME42BED
//
//            X Failure lessMatch
// _ ___ __ ___ __ _  _ ___ __ ___ __ _ _  _
// ##-#--#- #-- #---  ##_#__#_ #__ #___ ----
//
// _  _   _  _  _   _  _    _ _  ___   _ _   lessMatch === true
// __ __  __ _  _   __ _    _ __ ___   _ _   lessMatch === false
// ++ --  // ////   /* /****/ */ #-####--#
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
  // snake & kebab
  "[a-zA-Z0-9]+(?=[a-zA-Z0-9][_-])",
  "[a-zA-Z0-9](?=[_-])",
  // camel bumps
  // "\\b[A-Z]+(?![a-z0-9_-\\s])[A-Z]*",
  // "[A-Z]+",
  "[A-Z][a-z_-]+(?!\\b|\\s)",
  "[a-z]+(?!\\b|\\s)",
  "[A-Z]+(?!\\b|\\s)",
  "[0-9]+(?!\\b|\\s)",
  // "[a-z](?=[A-Z0-9_-])|[A-Z](?=[a-z0-9_-])|[0-9](?=[a-zA-Z_-])",
  // end of word
  "(?!-)\\S\\b\\s*",
  "\\S\\s+",
  // start of word
  "(?:\\b|^)(?!-)[\\S]",
  // end of line
  ".$",
  // empty lines
  "^s*$",
  // remaining isolated hyphens
  '-(?=\\W)',
].join('|'), modifiers)

// console.log(regex)

const adjustPosition = false

if (module) {
  module.exports = {regex, adjustPosition}
}

({regex, adjustPosition})
