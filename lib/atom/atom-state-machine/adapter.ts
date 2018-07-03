'use babel'

import {Adapter} from '../../state-machine'
import KeyboardManager from './adapter-keyboard'
import Labels from './adapter-labels'
import Status from './adapter-status'
import Focus from './adapter-focus'

type StatusBar = any

export const createAdapter = ({
  statusBar, onBlur, onKey
}: {
  statusBar: StatusBar, onBlur: Function, onKey: Function
}): {adapter: Adapter, destroy()} => {
  const focus = Focus()
  const keyboard = KeyboardManager({onBlur, onKey})
  const labels = Labels()
  const {
    adapter: status = {},
    destroy: destroyStatus = () => {},
  } = statusBar && Status(statusBar) || {}
  const adapter: Adapter = {
    ...focus,
    ...keyboard,
    ...labels,
    ...status || {},
  }
  const destroy = () => {
    destroyStatus()
  }
  return {adapter, destroy}
}
