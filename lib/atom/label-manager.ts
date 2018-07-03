'use babel'

import {Label} from '../label-interface'
import {LabelLayer, createLabelLayer} from './label-manager/label-layer'
import createLabel from './label-manager/create-label'
import animateBeacon, {animateBeaconType} from './label-manager/animate-beacon'

type addLabel = (
  label: Label,
) => void

export interface LabelManager {
  createLabel: (keyLabel: string, settings) => HTMLElement
  animateBeacon: animateBeaconType
  layer: LabelLayer
  addLabel: addLabel // shortcut for layer.addLabel
}

export const createLabelManager = (settings): LabelManager => {
  const layer = createLabelLayer(settings)
  return {
    get layer() {return layer},
    createLabel,
    animateBeacon,
    addLabel: layer.addLabel,
  }
}
