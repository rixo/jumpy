'use babel'

export type AnimateBeaconOptions = {
  delay?: boolean|number,
  cssClass?: string,
}

export interface Label {
  keyLabel: string
  element?: HTMLElement
  drawLabel(): void
  animateBeacon?: AnimateBeaconOptions
  jump(): void
  destroy?(): void
}
