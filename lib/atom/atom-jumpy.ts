'use babel'

import {CompositeDisposable} from 'atom'
import {createFactory} from './atom-state-machine'

const configKeyPath = 'jumpy'

export default () => {
  const {
    setConfig,
    setStatusBar,
    getStateMachine,
    withStateMachine,
    disposable: smDisposable,
  } = createFactory()
  
  let disposable

  const activate = () => {
    disposable = new CompositeDisposable()
    disposable.add(addCommands())
    disposable.add(observeConfig())
    // state machine disposable can be reused
    disposable.add(smDisposable)
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
