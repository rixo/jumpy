'use babel'

import {parseConfig} from '../config'
import {createStateMachine, Adapter} from '../state-machine'
import KeyboardManager from './adapter-keyboard'
import Labels from './adapter-labels'
import Status from './adapter-status'
import Focus from './adapter-focus'

type StatusBar = any

const createAdapter = ({
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

// Recreates the state machine when needed, using the last config
// and status bar service.
export const createFactory = () => {
  let lastConfig = null
  let statusBar = null
  let stateMachine = null
  let adapter = null

  const setConfig = config => {
    lastConfig = config
    stateMachine = null
  }

  const setStatusBar = bar => {
    statusBar = bar
    stateMachine = null
  }

  const getStateMachine = () => {
    if (!stateMachine) {
      createMachine()
    }
    if (!stateMachine) {
      throw new Error('Config must be initialized first')
    }
    return stateMachine
  }

  const createMachine = () => {
    const config = parseConfig(lastConfig)
    const bridge = {
      onBlur: () => api.cancel(),
      onKey: key => api.key(key),
    }
    adapter = createAdapter({statusBar, ...bridge})
    stateMachine = createStateMachine({config, adapter: adapter.adapter})
    const {api} = stateMachine
  }

  const withStateMachine = fn => (...args) => fn(getStateMachine(), ...args)

  const dispose = () => {
    adapter.destroy()
    lastConfig = stateMachine = adapter = null
  }
  const disposable = {dispose}

  return {
    setConfig,
    setStatusBar,
    getStateMachine,
    withStateMachine,
    disposable,
  }
}
