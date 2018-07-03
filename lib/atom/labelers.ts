'use babel'

import {LabelEnvironment} from '../label-interface'
import getWordLabels from './labelers/words'
import getTabLabels from './labelers/tabs'
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import getFindViewLabels from './labelers/find-view'

const concatAll = (a, b) => a.concat(b)

export const getLabels = (environment: LabelEnvironment) => {
  const wordLabels = getWordLabels(environment)

  const otherLabellers = [
    getSettingsLabels,
    getTreeViewLabels,
    getTabLabels,
    getFindViewLabels,
  ]
  const otherLabels = otherLabellers
    .map(getLabels => getLabels(environment))
    .reduce(concatAll, [])

  const allLabels = [...wordLabels, ...otherLabels]

  return {wordLabels, otherLabels, allLabels}
}
