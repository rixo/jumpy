'use babel'

import {LabelEnvironment} from '../label-interface'
import {getKeySet} from '../keys'
import createLabelManager from './label-manager'
import getWordLabels from '../labelers/words'
import getTabLabels from '../labelers/tabs'
import getSettingsLabels from '../labelers/settings'
import getTreeViewLabels from '../labelers/tree-view'
import {Data} from '../state-machine'

interface Labels {
  createLabels: (data: Data) => Data,
  destroyLabels: (data: Data) => Data,
  updateLabels: (data: Data) => void,
  flashNoMatch: () => void,
}

export default (config): Labels => {
  const hasKeyLabel = label => label.keyLabel
  const concatAll = (a, b) => a.concat(b)

  let labelManager = null

  const createLabels = (data: Data): Data => {
    labelManager = createLabelManager(config)
    const environment: LabelEnvironment = {
      settings: config,
      labels: labelManager,
    }

    const wordLabels = getWordLabels(environment)
    const otherLabellers = [
      getSettingsLabels,
      getTreeViewLabels,
      getTabLabels,
    ]
    const otherLabels = otherLabellers
      .map(getLabels => getLabels(environment))
      .reduce(concatAll, [])

    let allLabels = [...wordLabels, ...otherLabels]

    // assign keys
    const keys = getKeySet(config)
    allLabels = allLabels
      .map(keys.assignKeyLabel(allLabels.length, wordLabels.length))
      // exclude labels with no assigned keys
      .filter(hasKeyLabel)

    // render
    const isTruthy = x => !!x
    allLabels = allLabels
      .map(label => label.drawLabel())
      .filter(isTruthy)

    labelManager.render()

    return {
      ...data,
      labels: allLabels,
      visibleLabels: allLabels,
      hiddenLabels: [],
    }
  }

  const destroyLabels = (data: Data): Data => {
    if (labelManager) {
      labelManager.destroy()
      labelManager = null
    }
    // TODO remove: unneeded
    for (const label of data.labels) {
      label.destroy()
    }
    const empty = []
    return {
      ...data,
      labels: empty,
      visibleLabels: empty,
      hiddenLabels: empty,
    }
  }

  const updateLabels = (data: Data): void => {
    const {labels, visibleLabels, hiddenLabels, keys} = data
    if (keys.length === 0) {
      labels.forEach(({element}) => {
        if (element) {
          element.classList.remove('hot')
          element.classList.remove('irrelevant')
        }
      })
    } else {
      visibleLabels.forEach(({element}) => {
        if (element) {
          element.classList.add('hot')
          element.classList.remove('irrelevant')
        }
      })
      hiddenLabels.forEach(({element}) => {
        if (element) {
          element.classList.remove('hot')
          element.classList.add('irrelevant')
        }
      })
    }
  }

  const flashNoMatch = () => {
    if (!labelManager) {
      return
    }
    const {element} = labelManager
    const flash = document.createElement('div')
    flash.classList.add('jumpy-no-match-flash')
    element.appendChild(flash)
    setTimeout(() => flash.remove(), 500)
  }

  return {
    createLabels,
    destroyLabels,
    updateLabels,
    flashNoMatch,
  }
}
