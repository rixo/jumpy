'use babel'

import {Config} from '../config'
import {getCoordsInEditor} from './adapter-labels/editor-coords'
import {LabelManager} from './adapter-labels/label-manager'
import {Label} from './adapter-labels/label'
import getWordLabels from './labelers/words'
import getTabLabels from './labelers/tabs'
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import getFindViewLabels from './labelers/find-view'

export interface LabelEnvironment {
  settings: Config
  getCoordsInEditor: getCoordsInEditor
  labels: LabelManager
}

export interface Labeler {
  (environment: LabelEnvironment): Array<Label>
}

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
