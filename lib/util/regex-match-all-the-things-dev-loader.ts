/**
 * Dev helper that reloads the regex file each time jumpy is toggled, without
 * reloading the whole Atom environment. Feedback loop FTW!
 */

 import {Label} from '../label-interface'

 // reloads regex implem without having to restart Atom
 const DEBUG_REGEX = false

 const $$$ = fn => fn()

 export const getRegex = $$$(() => {
   interface Matcher {
     regex: RegExp
     adjustPosition: ((match: RegExpExecArray, label: Label) => {}) | false
   }
   const regexFile = 'regex-match-all-the-things.js'
   const matchAllTheThings = require(`./${regexFile}`)
   const loadRegexDebug: () => Matcher = <any> DEBUG_REGEX && (() => {
     try {
       const fs = require('fs')
       const code = fs.readFileSync(`${__dirname}/${regexFile}`, 'utf8')
       return eval(code)
     } catch (err) {
       console.error(err)
       debugger
     }
   })
   return ({
     useBuiltInRegexMatchAllTheThings,
     wordsPattern,
   }: {
     useBuiltInRegexMatchAllTheThings: boolean,
     wordsPattern: RegExp,
   }): Matcher => {
     if (useBuiltInRegexMatchAllTheThings) {
       if (DEBUG_REGEX) {
         return loadRegexDebug()
       } else {
         return matchAllTheThings
       }
     } else {
       return {regex: wordsPattern, adjustPosition: false}
     }
   }
 })

 export default getRegex
