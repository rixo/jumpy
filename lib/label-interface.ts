import { TextEditor } from 'atom'

export interface LabelEnvironment {
  keys: Array<string>
  settings: any
}

type addMarker = (
  editor: TextEditor,
  element: HTMLElement,
  lineNumber: number,
  column: number,
) => void

export interface Label {
  // TODO: can I make this | null instead of undefined?
  keyLabel: string | undefined
  element: HTMLElement | null
  settings: any
  drawLabel(addMarker?: addMarker): Label
  animateBeacon(input: any): void
  jump(): void
  destroy(): void
}

export interface Labeler {
  (environment:LabelEnvironment):Array<Label>
}
