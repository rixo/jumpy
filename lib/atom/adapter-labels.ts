'use babel'

import {LabelEnvironment as GlobalLabelEnvironment} from '../label-interface'
import {getKeySet} from '../keyset'
import {createLabelManager, LabelManager} from './label-manager'
import {createTextEditorLocators, getCoordsInEditor} from './editor-coords'
import {getLabels} from './labelers'
import {Data, LabelAdapter, FlashAdapter} from '../state-machine'

interface Adapter extends LabelAdapter, FlashAdapter {}

export interface LabelEnvironment extends GlobalLabelEnvironment {
  getCoordsInEditor: getCoordsInEditor
}

export default (config): Adapter => {
  const hasKeyLabel = label => label.keyLabel

  let labelManager: LabelManager = null

  const createLabels = (data: Data): Data => {
    const getCoordsInEditor = createTextEditorLocators()

    labelManager = createLabelManager(config)
    const environment: LabelEnvironment = {
      settings: config,
      labels: labelManager,
      getCoordsInEditor,
    }

    const {wordLabels, allLabels} = getLabels(environment)

    let visibleLabels = allLabels

    // assign keys
    const keyset = getKeySet(config)
    visibleLabels = visibleLabels
      .map(keyset.assignKeyLabel(visibleLabels.length, wordLabels.length))
      // exclude labels with no assigned keyset
      .filter(hasKeyLabel)

    // render
    const isRendered = ({element}) => !!element
    const renderLabel = label => {label.drawLabel()}
    visibleLabels
      .forEach(renderLabel)
    visibleLabels = visibleLabels
      .filter(isRendered)
    visibleLabels
      .forEach(labelManager.addLabel)

    labelManager.layer.render()

    return {
      ...data,
      labels: visibleLabels,
      visibleLabels,
      hiddenLabels: [],
    }
  }

  const destroyLabels = (data: Data): Data => {
    if (labelManager) {
      labelManager.layer.destroy()
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
    const {element} = labelManager.layer
    const flash = document.createElement('div')
    flash.classList.add('jumpy-no-match-flash')
    element.appendChild(flash)
    setTimeout(() => flash.remove(), 500)
  }

  return {
    createLabels,
    destroyLabels,
    updateLabels,
    jump: ({}, {label}) => {
      label.jump()
    },
    animateBeacon: ({}, {label}) => {
      // TODO env is not public in Label
      label.env.labels.animateBeacon(label)
    },
    flashNoMatch,
  }
}
