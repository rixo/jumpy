import {TextEditor} from 'atom'

export type addMarker = (
  element: HTMLElement,
  lineNumber: number,
  column: number,
) => void

interface MarkerManager {
  addMarker: addMarker
  addEditorMarker: (
    editor: TextEditor,
    element: HTMLElement,
    lineNumber: number,
    column: number,
  ) => void
}

export interface KeySet {
  assignKeyLabel(n: number): (o: object) => object
}

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
