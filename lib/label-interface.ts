import {MarkerManager} from './marker-manager'

export interface LabelEnvironment {
  settings: any
  markers: MarkerManager
}

export interface Label {
  keyLabel: string
  element: HTMLElement
  drawLabel(): Label
  animateBeacon(): void
  jump(): void
  destroy(): void
}

export interface Labeler {
  (environment:LabelEnvironment):Array<Label>
}
