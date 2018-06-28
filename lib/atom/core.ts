'use babel'

import {CompositeDisposable} from 'atom'
import {
  createStateMachine,
  Data,
  Adapter,
} from '../state-machine'
import {Config, parseConfig} from '../config'
import KeyboardManager from './keyboard'
import Labels from './labels'

const configKeyPath = 'jumpy'

const Adapter = ({
  config, onBlur, onKey
}: {
  config: Config, onBlur: Function, onKey: Function
}): Adapter => {
  const keyboard = KeyboardManager({onBlur, onKey})
  const labels = Labels(config)
  return {
    ...keyboard,
    ...labels,
    focus: () => {
      const workspaceEl = atom.views.getView(atom.workspace)
      workspaceEl.classList.add('jumpy-jump-mode')
    },
    blur: () => {
      const workspaceEl = atom.views.getView(atom.workspace)
      workspaceEl.classList.remove('jumpy-jump-mode')
    },
    jump: (data: Data, {label}) => {
      const {config: {useHomingBeaconEffectOnJumps}} = data
      if (useHomingBeaconEffectOnJumps) {
        label.animateBeacon()
      }
      label.jump()
    },
  }
}

const createStateMachineCache = () => {
  let lastConfig = null
  let stateMachine = null
  let adapter = null

  const setConfig = config => {lastConfig = config}

  const getStateMachine = () => {
    if (lastConfig) {
      const config = parseConfig(lastConfig)
      lastConfig = null
      createParts(config)
    }
    if (!stateMachine) {
      throw new Error('Config must be initialized first')
    }
    return stateMachine
  }

  const createParts = (config: Config) => {
    const bridge = {
      onBlur: () => api.cancel(),
      onKey: key => api.key(key),
    }
    adapter = Adapter({config, ...bridge})
    stateMachine = createStateMachine({config, adapter})
    const {api} = stateMachine
  }

  const withStateMachine = fn => (...args) => fn(getStateMachine(), ...args)

  const dispose = () => {
    lastConfig = stateMachine = adapter = null
  }
  const disposable = {dispose}

  return {
    setConfig,
    getStateMachine,
    withStateMachine,
    disposable,
    // for tests
    get adapter() {return adapter},
    get stateMachine() {return stateMachine},
  }
}

export default () => {
  const stateMachineCache = createStateMachineCache()
  const {
    setConfig,
    getStateMachine,
    withStateMachine,
    disposable: smcDisposable,
  } = stateMachineCache
  let disposable

  return {
    activate,
    deactivate,
    // for tests
    getStateMachine,
    stateMachineCache,
  }

  function activate() {
    disposable = new CompositeDisposable()
    disposable.add(
      addCommands()
    )
    disposable.add(
      observeConfig()
    )
    disposable.add(smcDisposable)
    // be ready for next command (from my observations, should have
    // already been done by observeConfig but let's be double sure here)
    setConfig(
      atom.config.get(configKeyPath)
    )
  }

  function deactivate() {
    disposable.dispose()
    disposable = null
  }

  function addCommands() {
    return atom.commands.add('atom-workspace', {
      [`${configKeyPath}:toggle`]: withStateMachine(({api}) => api.activate()),
      [`${configKeyPath}:back`]: withStateMachine(({api}) => api.back()),
      [`${configKeyPath}:reset`]: withStateMachine(({api}) => api.reset()),
      [`${configKeyPath}:clear`]: withStateMachine(({api}) => api.cancel()),
    })
  }

  function observeConfig() {
    return atom.config.observe(configKeyPath, setConfig)
  }
}
