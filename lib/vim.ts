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
  jumpyView: {
    toggle(callback: (label) => boolean | void): void
  }
}

type setup = (jumpy: Jumpy, service: VimService) => void

// export const setup = ({getClass: () => Object}) => {
export const setup: setup = (jumpy, vim) => {
  const {getClass, registerCommandFromSpec} = vim
  const Motion = <{new(): Motion}> getClass('Motion')

  const charsMax = Number.MAX_VALUE
  const purpose = 'jumpy'

  class VimJump extends Motion {
    inclusive = true
    requireInput = true
    initialize() {
      const {jumpyView} = jumpy
      if (!jumpyView) {
        this.cancelOperation()
        return
      }
      jumpyView.toggle((label) => {
        if (label.hasOwnProperty('lineNumber')) {
          this.input = label
          this.processOperation()
          return false
        }
      })
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
