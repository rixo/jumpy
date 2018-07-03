'use babel'

// TODO remove dependency on editor specific code
import {LabelManager} from './atom/label-manager'

export interface LabelEnvironment {
  settings: any
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
  beaconClass?: string
  jump(): void
  destroy(): void
}

export interface Labeler {
  (environment: LabelEnvironment): Array<Label>
}
