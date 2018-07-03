'use babel'

import {Label as AgnosticLabel} from '../../label-interface'

interface CSSPosition {
  top?: string
  bottom?: string
  left?: string
  right?: string
}

export type LabelPosition = {x: number, y: number} | CSSPosition

export interface Label extends AgnosticLabel {
  labelPosition: LabelPosition
}
