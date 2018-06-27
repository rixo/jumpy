'use babel'

import {TextEditor} from 'atom'

interface VimService {
  getEditorState(editor: TextEditor)
  getGlobalState()
  getClass(name: string): {new(): Object}
  registerCommandFromSpec(klassName: string, spec: Object)
}

interface Motion {
  input: any
  initialize(): void
  focusInput(options): void
  processOperation(): void
  cancelOperation(): void
}

interface Jumpy {
  core: {
    getStateMachine,
  }
}

type setup = (jumpy: Jumpy, service: VimService) => void

// export const setup = ({getClass: () => Object}) => {
export const setup: setup = (jumpy, vim) => {
  const {getClass, registerCommandFromSpec} = vim
  const Motion = <{new(): Motion}> getClass('Motion')

  class VimJump extends Motion {
    inclusive = true
    requireInput = true
    initialize() {
      const {core} = jumpy
      if (!core) {
        this.cancelOperation()
        return
      }
      const onJump = ({label}) => {
        // we MUST give a value to input prop in order for
        // processOperation to work
        this.input = label
        this.processOperation()
        return false // prevent regular jump
      }
      const onCancel = () => {
        this.cancelOperation()
      }
      core.getStateMachine().api.activate(onJump, onCancel)
    }
    moveCursor() {
      this.input.jump()
    }
  }

  registerCommandFromSpec('VimJump', {
    getClass: className => {
      if (className === 'VimJump') {
        return VimJump
      } else {
        throw new Error(`No class ${className} here!`)
      }
    },
    prefix: 'jumpy',
    scope: 'atom-text-editor',
  })
}
