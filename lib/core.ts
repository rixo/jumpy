'use babel'

import {CompositeDisposable} from 'atom'
import {createStateMachine} from './state-machine'
import {LabelEnvironment} from './label-interface'
import {getKeySet} from './keys'
import createLabelManager from './label-manager'
import getWordLabels from './labelers/words'
import getTabLabels from './labelers/tabs'
import getSettingsLabels from './labelers/settings'
import getTreeViewLabels from './labelers/tree-view'
import {Config, parseConfig} from './config'

const configKeyPath = 'jumpy'

const Adapter = ({
  config, onBlur, onKey
}: {
  config: Config, onBlur: Function, onKey: Function
}) => {
  const keyboard = KeyboardManager({onBlur, onKey})
  const labels = Labels(config)
  return {
    grabKeyboard: keyboard.grab,
    releaseKeyboard: keyboard.release,
    createLabels: labels.createLabels,
    destroyLabels: labels.destroyLabels,
    updateLabels: labels.updateLabels,
    // jump: (data, {label}) => console.log('jump', event.label),
    jump: (data, {label}) => {
      label.jump()
    },
    statusIdle: () => console.log('statusIdle'),
    statusMatch: () => console.log('statusMatch'),
    statusNoMatch: () => console.log('statusNoMatch'),
  }
}

const Labels = (config) => {
  const hasKeyLabel = label => label.keyLabel
  const concatAll = (a, b) => a.concat(b)

  let labelManager = null

  const createLabels = (data) => {
    labelManager = createLabelManager(config)
    const environment: LabelEnvironment = {
      settings: config,
      labels: labelManager,
    }

    const wordLabels = getWordLabels(environment)
    const otherLabellers = [
      getSettingsLabels,
      getTreeViewLabels,
      getTabLabels,
    ]
    const otherLabels = otherLabellers
      .map(getLabels => getLabels(environment))
      .reduce(concatAll, [])

    let allLabels = [...wordLabels, ...otherLabels]

    // assign keys
    const keys = getKeySet(config)
    allLabels = allLabels
      .map(keys.assignKeyLabel(allLabels.length, wordLabels.length))
      // exclude labels with no assigned keys
      .filter(hasKeyLabel)

    // render
    const isTruthy = x => !!x
    allLabels = allLabels
      .map(label => label.drawLabel())
      .filter(isTruthy)

    labelManager.render()

    return {
      ...data,
      labels: allLabels,
      visibleLabels: allLabels,
      hiddenLabels: [],
    }
  }

  const destroyLabels = (data) => {
    if (labelManager) {
      labelManager.destroy()
      labelManager = null
    }
    // TODO remove: unneeded
    for (const label of data.labels) {
      label.destroy()
    }
    const empty = []
    return {
      ...data,
      labels: empty,
      visibleLabels: empty,
      hiddenLabels: empty,
    }
  }

  const updateLabels = data => {
    const {visibleLabels, hiddenLabels} = data
    visibleLabels.forEach(({element}) => {
      if (element) {
        element.classList.add('hot')
        element.classList.remove('irrelevant')
      }
    })
    hiddenLabels.forEach(({element}) => {
      if (element) {
        element.classList.remove('hot')
        element.classList.add('irrelevant')
      }
    })
  }

  return {
    createLabels,
    destroyLabels,
    updateLabels,
  }
}

const KeyboardManager = ({onBlur, onKey}) => {
  const keyEventsElement = document.body

  const grab = () => {
    keyEventsElement.addEventListener('keydown', onKeydown, true);
    if (onBlur) {
      for (const e of ['blur', 'click', 'scroll']) {
        keyEventsElement.addEventListener(e, onBlur, true);
      }
    }
  }

  const release = () => {
    keyEventsElement.removeEventListener('keydown', onKeydown, true);
    if (onBlur) {
      for (const e of ['blur', 'click', 'scroll']) {
        keyEventsElement.removeEventListener(e, onBlur, true);
      }
    }
  }

  const onKeydown = (event) => {
    // only test with `key`, not `prop` because code may be
    // misleading on some international keyboard layours for
    // example, 'm' key on FR azerty reports as code 'Semicolon')
    const {key, metaKey, ctrlKey, altKey} = event
    if (metaKey || ctrlKey || altKey) {
      return
    }
    if (/^[A-Za-z]{1}$/.test(key)) {
      event.preventDefault()
      event.stopPropagation()
      onKey(key)
    }
  }

  return {grab, release}
}

export default () => {
  let disposable
  let adapter
  let fsm

  return {
    activate,
    deactivate,
  }

  function activate() {
    disposable = new CompositeDisposable()
    disposable.add(
      addCommands()
    )
    disposable.add(
      observeConfig()
    )
    init(atom.config.get(configKeyPath))
  }

  function deactivate() {
    disposable.dispose()
    disposable = null
    adapter = null
    fsm = null
  }

  function init(config) {
    config = parseConfig(config)
    const bridge = {
      onBlur: () => fsm.cancel(),
      onKey: key => fsm.key(key),
    }
    adapter = Adapter({config, ...bridge})
    fsm = createStateMachine({config, adapter})
  }

  function addCommands() {
    return atom.commands.add('atom-workspace', {
      [`${configKeyPath}:toggle`]: () => fsm.activate(),
      [`${configKeyPath}:reset`]: () => fsm.reset(),
      [`${configKeyPath}:clear`]: () => fsm.cancel(),
    })
  }

  function observeConfig() {
    let lastHash = JSON.stringify(atom.config.get(configKeyPath))
    return atom.config.observe(configKeyPath, config => {
      const hash = JSON.stringify(config)
      if (hash === lastHash) {
        return
      } else {
        lastHash = hash
      }
      init(config)
    })
  }
}
