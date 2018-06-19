
export type addMarker = (
  element: HTMLElement,
  lineNumber: number,
  column: number,
) => void

interface MarkerManager {
  addMarker: Function,
  addEditorMarker: Function,
}

export interface KeySet {
  assignKeyLabel(n: number): (o: object) => object
}

export interface LabelEnvironment {
  settings: any
  markers: MarkerManager
}

export interface Label {
  // TODO: can I make this | null instead of undefined?
  keyLabel: string | undefined
  element: HTMLElement | null
  drawLabel(): Label
  animateBeacon(input: any): void
  jump(): void
  destroy(): void
}

export interface Labeler {
  (environment:LabelEnvironment):Array<Label>
}
