/**
 * Utilities supporting smart case matching.
 */

'use babel'

import {Config} from '../config'
import {Label} from '../label-interface'

interface Data {
  config: Config
  keys: string[]
  labels: Label[]
  visibleLabels: Label[]
  hiddenLabels: Label[]
}

const lc = s => s.toLowerCase()
const uc = s => s.toUpperCase()

export const createLabelMatcher = ({
  config: {smartCaseMatch},
  keys,
  visibleLabels,
}) => {
  const testIndex = keys.length - 1
  const character = keys.slice(-1)[0]
  if (smartCaseMatch) {
    const lcChar = lc(character)
    const ucChar = uc(character)
    const hasUpperCase = visibleLabels.some(
      ({keyLabel}) => keyLabel[testIndex] === ucChar
    )
    const hasLowerCase = visibleLabels.some(
      ({keyLabel}) => keyLabel[testIndex] === lcChar
    )
    const hasMixedCase = hasUpperCase && hasLowerCase
    return hasMixedCase
      ? ({keyLabel}) => keyLabel[testIndex] === character
      : ({keyLabel}) => lc(keyLabel[testIndex]) === lcChar
  } else {
    return ({keyLabel}) => keyLabel[testIndex] === character
  }
}

export const filterLabels = (data: Data): Data => {
  const {labels, keys} = data
  let visibleLabels, hiddenLabels
  if (keys.length === 0) {
    visibleLabels = labels
    hiddenLabels = []
  } else {
    const test = createLabelMatcher(data)
    visibleLabels = labels
    hiddenLabels = []
    visibleLabels = data.visibleLabels.filter(label => {
      if (test(label)) {
        return true
      } else {
        hiddenLabels.push(label)
        return false
      }
    })
  }
  return {
    ...data,
    visibleLabels,
    hiddenLabels,
  }
}
