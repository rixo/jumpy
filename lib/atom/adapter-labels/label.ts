'use babel'

import {Config} from '../../config'
import {getCoordsInEditor} from './editor-coords'
import {LabelManager} from './label-manager'

export interface LabelEnvironment {
  settings: Config
  getCoordsInEditor: getCoordsInEditor
  labels: LabelManager
}

interface CSSPosition {
  top?: string
  bottom?: string
  left?: string
  right?: string
}

export type LabelPosition = {x: number, y: number} | CSSPosition

export type AnimateBeaconOptions = {
  delay?: boolean|number,
  cssClass?: string,
}

export interface Label {
  keyLabel: string
  element?: HTMLElement
  labelPosition: LabelPosition
  drawLabel(): void
  animateBeacon?: AnimateBeaconOptions
  jump(): void
  destroy?(): void
}

export interface Labeler {
  (environment: LabelEnvironment): Array<Label>
}
