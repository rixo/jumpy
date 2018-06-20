'use babel';

import * as _ from 'lodash';
import {KeySet} from './label-interface'

export const getKeySet = settings => settings.preferAlternateHands
  ? AlternateKeySet(settings)
  : getKeySetLegacy(settings)

const concatAll = (a, b) => a.concat(b)

const combineLeft = ([left, right]: [string[], string[]]): string[][] => left.map(
  leftKey => right.map(rightKey => leftKey + rightKey) // ['',...]
) // [['', ...], ...]

const KeySet = (combos: string[]): KeySet => {
  const assignKeyLabel = () => o => {
    o.keyLabel = combos.shift()
    return o
  }
  return {
    assignKeyLabel,
  }
}

const $$$ = fn => fn()

const AlternateKeySet = $$$(() => {
  const upper = (keys: string[]): string[] => keys.map(key => key.toUpperCase())
  const lower = (keys: string[]): string[] => keys.map(key => key.toLowerCase())

  const hashSettings = ({customKeysLeft, customKeysRight}) =>
    `${String(customKeysLeft)} | ${String(customKeysRight)}`

  let lastSettingsHash = null
  let allCombos: string[]
  let bestCombos: string[]

  const refreshPairs = settings => {
    const currentHash = hashSettings(settings)
    if (currentHash === lastSettingsHash) {
      return
    } else {
      lastSettingsHash = currentHash
    }
    const {customKeysLeft, customKeysRight} = settings
    const leftLC = lower(customKeysLeft)
    const rightLC = lower(customKeysRight)
    const leftUC = upper(leftLC)
    const rightUC = upper(rightLC)
    const pairs: [string[], string[]][] = [
      [leftLC, leftLC],
      [rightLC, rightLC],
      [leftLC, rightUC],
      [rightLC, leftUC],
      [leftUC, rightLC],
      [rightUC, leftLC],
      [leftUC, rightUC],
      [rightUC, leftUC],
      [leftUC, leftUC],
      [rightUC, rightUC],
    ]
    const bestPairs: [string[], string[]][] = [
      [leftLC, rightLC],
      [rightLC, leftLC],
    ]
    allCombos = generateCombos(pairs)
    bestCombos = generateCombos(bestPairs)
  }

  const generateCombos = (pairs: [string[], string[]][]): string[] => {
    const combos = pairs
      .map(combineLeft) // [[['',...],...],...]
      .reduce(concatAll, []) // [['',...],...]
      .reduce(concatAll, []) // ['', ...]
    return combos
  }

  // tries to position best shortcuts in the middle of the editor
  const getOptimalCombos = (n: number, nWords: number) => {
    const missingBestCombos = Math.max(0, nWords - bestCombos.length)
    const editorPre = Math.ceil(missingBestCombos / 2)
    const editorPost = editorPre + bestCombos.length
    const remaining = n - editorPost
    const combos = [
      ...allCombos.slice(0, editorPre),
      ...bestCombos,
      ...allCombos.slice(editorPre, editorPre + remaining)
    ]
    return combos
  }

  return (settings) => {
    const assignKeyLabel = (n: number, nWords: number) => {
      refreshPairs(settings)
      const combos = getOptimalCombos(n, nWords)
      return o => {
        o.keyLabel = combos.shift()
        return o
      }
    }
    return {
      assignKeyLabel,
    }
  }
})

function getKeySetLegacy(settings) {
    const customKeys = settings.customKeys;
    let lowerCharacters: Array<string> = [];
    let upperCharacters: Array<string> = [];

    if (!customKeys.length) {
        lowerCharacters = _.range('a'.charCodeAt(0), 'z'.charCodeAt(0) + 1 /* for inclusive*/)
            .map(c => String.fromCharCode(c));
        upperCharacters = _.range('A'.charCodeAt(0), 'Z'.charCodeAt(0) + 1 /* for inclusive*/)
            .map(c => String.fromCharCode(c));
    } else {
        for (let key of customKeys) {
            lowerCharacters.push(key.toLowerCase());
            upperCharacters.push(key.toUpperCase());
        }
    }

    const keys: Array<string> = [];

    // A little ugly.
    // I used itertools.permutation in python.
    // Couldn't find a good one in npm.  Don't worry this takes < 1ms once.
    // TODO: try a zip? and or make a func
    for (let c1 of lowerCharacters) {
        for (let c2 of lowerCharacters) {
            keys.push(c1 + c2);
        }
    }
    for (let c1 of upperCharacters) {
        for (let c2 of lowerCharacters) {
            keys.push(c1 + c2);
        }
    }
    for (let c1 of lowerCharacters) {
        for (let c2 of upperCharacters) {
            keys.push(c1 + c2);
        }
    }

    // TODO: use TS's ReadonlyArray?
    return KeySet(keys);
}
