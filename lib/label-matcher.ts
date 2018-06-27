'use babel'

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
