'use babel'

// TODO remove dependency on editor specific code
import {LabelManager} from './atom/label-manager'

export interface LabelEnvironment {
  settings: any
  labels: LabelManager
}

export interface Label {
  keyLabel: string
  element?: HTMLElement
  drawLabel(): Label
  animateBeacon(): void
  jump(): void
  destroy(): void
}

export interface Labeler {
  (environment:LabelEnvironment):Array<Label>
}
