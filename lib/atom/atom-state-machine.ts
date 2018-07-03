/**
 * Creates a factory object that is used to keep a Jumpy state machine
 * (becoming a Atom Jumpy state machine for the occasion) in sync with
 * Atom's config and available services (statusBar...).
 */

'use babel'

import {parseConfig} from '../config'
import {createStateMachine} from '../state-machine'
import {createAdapter} from './atom-state-machine/adapter'

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
