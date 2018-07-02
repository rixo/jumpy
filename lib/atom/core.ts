'use babel'

import {CompositeDisposable} from 'atom'
import {
  createStateMachine,
  Adapter,
} from '../state-machine'
import {Config, parseConfig} from '../config'
import KeyboardManager from './adapter-keyboard'
import Labels from './adapter-labels'
import Status from './adapter-status'

const configKeyPath = 'jumpy'

type StatusBar = any

const createAdapter = ({
  config, statusBar, onBlur, onKey
}: {
  config: Config, statusBar: StatusBar, onBlur: Function, onKey: Function
}): {adapter: Adapter, destroy()} => {
  const keyboard = KeyboardManager({onBlur, onKey})
  const labels = Labels(config)
  const {
    adapter: status = {},
    destroy: destroyStatus = () => {},
  } = statusBar && Status(statusBar) || {}
  const adapter: Adapter = {
    ...keyboard,
    ...labels,
    ...status || {},
    focus: () => {
      const workspaceEl = atom.views.getView(atom.workspace)
      workspaceEl.classList.add('jumpy-jump-mode')
    },
    blur: () => {
      const workspaceEl = atom.views.getView(atom.workspace)
      workspaceEl.classList.remove('jumpy-jump-mode')
    },
  }
  const destroy = () => {
    destroyStatus()
  }
  return {adapter, destroy}
}

const createStateMachineCache = () => {
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
    adapter = createAdapter({config, statusBar, ...bridge})
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

export default () => {
  const stateMachineCache = createStateMachineCache()
  const {
    setConfig,
    setStatusBar,
    getStateMachine,
    withStateMachine,
    disposable: smcDisposable,
  } = stateMachineCache
  let disposable

  const activate = () => {
    disposable = new CompositeDisposable()
    disposable.add(addCommands())
    disposable.add(observeConfig())
    disposable.add(smcDisposable)
    // be ready for next command (from my observations, should have
    // already been done by observeConfig but let's be double sure here)
    setConfig(atom.config.get(configKeyPath))
  }

  const deactivate = () => {
    disposable.dispose()
    disposable = null
  }

  const addCommands = () => atom.commands.add('atom-workspace', {
    [`jumpy:toggle`]: withStateMachine(({api}) => api.activate()),
    [`jumpy:back`]: withStateMachine(({api}) => api.back()),
    [`jumpy:reset`]: withStateMachine(({api}) => api.reset()),
    [`jumpy:clear`]: withStateMachine(({api}) => api.cancel()),
  })

  const observeConfig = () => atom.config.observe(configKeyPath, setConfig)

  return {
    setStatusBar,
    activate,
    deactivate,
    // for tests
    getStateMachine,
  }
}
