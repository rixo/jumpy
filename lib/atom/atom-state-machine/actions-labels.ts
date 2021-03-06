'use babel'

import {getKeySet} from '../../util/keyset'
import {createLabelManager, LabelManager} from '../labels/label-manager'
import {createTextEditorLocators} from '../labels/editor-coords'
import {LabelEnvironment, getLabels} from '../labelers'
import {Data, LabelAdapter, FlashAdapter} from '../../state-machine'

interface Adapter extends LabelAdapter, FlashAdapter {}

export default (): Adapter => {

  let labelManager: LabelManager = null

  const createLabels = (data: Data): Data => {
    const config = data.config

    const getCoordsInEditor = createTextEditorLocators()

    labelManager = createLabelManager(config)
    const environment: LabelEnvironment = {
      settings: config,
      labels: labelManager,
      getCoordsInEditor,
    }

    const {wordLabels, allLabels} = getLabels(environment)

    const visibleLabels = allLabels
      // assign keys
      .map(assignKeyLabel(config, allLabels, wordLabels))
      .filter(hasKeyLabel)
      // render
      .map(renderLabel)
      .filter(isRendered)

    visibleLabels.forEach(labelManager.addLabel)

    labelManager.layer.render()

    return {
      ...data,
      // only keep initially visible labels (non visible ones either
      // miss keyLabel or element)
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
    // special destroy
    for (const label of data.labels) {
      if (label.destroy) {
        label.destroy()
      }
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
    jump: ({}, {label, ...event}) => {
      label.jump(event)
    },
    animateBeacon: ({}, {label}) => {
      if (labelManager) {
        labelManager.animateBeacon(label)
      }
    },
    flashNoMatch,
  }
}

const hasKeyLabel = label => label.keyLabel

const assignKeyLabel = (config, allLabels, primaryLabels) => {
  const keyset = getKeySet(config)
  const primaryCount = primaryLabels.length
  const allCount = allLabels.length
  return keyset.assignKeyLabel(allCount, primaryCount)
}

const isRendered = ({element}) => !!element

const renderLabel = label => {
  label.drawLabel()
  return label
}
