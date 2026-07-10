'use babel'

import {Config} from '../config'
import {getCoordsInEditor} from './labels/editor-coords'
import {LabelManager} from './labels/label-manager'
import {Label} from './labels/label'
import getWordLabels from './labelers/words'
import getTabLabels from './labelers/tabs'
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import getFindViewLabels from './labelers/find-view'
import getGithubPaneLabels from './labelers/github-pane'

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
    // getGithubPaneLabels,
  ]
  const otherLabels = otherLabellers
    .map(getLabels => getLabels(environment))
    .reduce(concatAll, [])

  const allLabels = [...wordLabels, ...otherLabels]

  return {wordLabels, otherLabels, allLabels}
}
