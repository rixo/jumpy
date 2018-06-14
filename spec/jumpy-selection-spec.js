'use babel'

const code = `
  this is some example
  multiline text
`

fdescribe('jumpy visual mode selection', () => {
  let jumpy
  let editor

  const mockVisualMode = () => {
    editor.element.classList.add('visual-mode')
  }

  const selectChar = (row, col) => {
    editor.setCursorBufferPosition([row, col])
    editor.selectRight()
    mockVisualMode()
    return {jump}
  }

  const selectRight = (from, [toRow, toCol]) => {
    editor.setSelectedBufferRange([from, [toRow, toCol + 1]])
    mockVisualMode()
    return {jump}
  }

  const selectLeft = (from, [toRow, toCol]) => {
    editor.setSelectedBufferRange([from, [toRow, toCol + 1]], {reversed: true})
    mockVisualMode()
    return {jump}
  }

  const jump = (row, col, callback) => {
    const {element} = atom.workspace.getActiveTextEditor()
    atom.config.set('jumpy.matchPattern', '.')
    const promise = atom.commands.dispatch(element, 'jumpy:toggle').then(() => {
      const {jumpyView: {currentLabels, fsm}} = jumpy
      const label = currentLabels.find(
        ({lineNumber, column}) => row === lineNumber && col === column
      )
      if (!label) {
        throw new Error(`No label at ${row}:${col}`)
      }
      if (!fsm.can('jump')) {
        throw new Error('Cannot jump')
      }
      fsm.jump(label)
      if (callback) {
        const text = editor.getSelectedText()
        const {row, column} = editor.getCursorBufferPosition()
        return callback(text, [row, column])
      }
    })
    promise.jump = (...args) => promise.then(() => jump(...args))
    return promise
  }

  beforeEach(() => {
    const workspaceElement = atom.views.getView(atom.workspace)
    workspaceElement.style.height = '5000px'
    workspaceElement.style.width = '5000px'
    jasmine.attachToDOM(workspaceElement)
    return Promise.all([
      atom.packages.activatePackage('jumpy'),
      // atom.packages.activatePackage('status-bar'),
      atom.workspace.open(),
    ]).then(() => {
      const pack = atom.packages.getActivePackage('jumpy')
      jumpy = pack.mainModule
      jumpy.jumpyView
    }).then(() => {
      editor = atom.workspace.getActiveTextEditor()
      editor.setText(code)
    })
  })

  //////////////////////////////////////////////////////////////////////////////
  //
  // It selects from origin char included to target char included.
  //
  //   0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22
  // 0
  // 1       t  h  i  s     i  s     s  o  m  e     e  x  a  m  p  l  e
  // 2       m  u  l  t  i  l  i  n  e     t  e  x  t
  //
  describe('in vim visual mode', () => {
    beforeEach(() => {
      mockVisualMode()
    })
    describe('when starting from 1-length selection', () => {
      describe('jumping forward', () => {
        it('selects on the same line', () => {
          return selectChar(1, 10).jump(1, 13, selectedText => {
            expect(selectedText).toBe('some')
          })
        })
        it('selects on multiline', () => {
          return selectChar(1, 15).jump(2, 10, selectedText => {
            expect(selectedText).toBe('example\n  multiline')
          })
        })
      })
      describe('jumping backward', () => {
        it('selects on the same line', () => {
          return selectChar(1, 13).jump(1, 10, (text, caret) => {
            expect(text).toBe('some')
            expect(caret).toEqual([1, 10])
          })
        })
        it('selects on multiline', () => {
          return selectChar(2, 10).jump(1, 15, (text, caret) => {
            expect(text).toBe('example\n  multiline')
            expect(caret).toEqual([1, 15])
          })
        })
      })
    })
    describe('when starting from right of existing selection', () => {
      describe('jumping forward', () => {
        it('selects on the same line', () => {
          return selectRight([1, 10], [1, 13]).jump(1, 18, (text, caret) => {
            expect(text).toBe('some exam')
            expect(caret).toEqual([1, 19])
          })
        })
        it('selects on multiline', () => {
          return selectRight([1, 20], [1, 21]).jump(2, 6, (text, caret) => {
            expect(text).toBe('le\n  multi')
            expect(caret).toEqual([2, 7])
          })
        })
      })
      describe('jumping backward', () => {
        it('selects on the same line', () => {
          return selectRight([1, 10], [1, 13]).jump(1, 7, (text, caret) => {
            expect(text).toBe('is s')
            expect(caret).toEqual([1, 7])
          })
        })
        it('selects on multiline', () => {
          return selectRight([2, 2], [2, 5]).jump(1, 17, (text, caret) => {
            expect(text).toBe('ample\n  m')
            expect(caret).toEqual([1, 17])
          })
        })
      })
    })
    describe('when starting from left of existing selection', () => {
      describe('jumping forward', () => {
        it('selects on the same line', () => {
          return selectLeft([1, 10], [1, 13]).jump(1, 16, (text, caret) => {
            expect(text).toBe('e ex')
            expect(caret).toEqual([1, 17])
          })
        })
        it('selects on multiline', () => {
          return selectLeft([1, 17], [1, 19]).jump(2, 4, (text, caret) => {
            expect(text).toBe('ple\n  mul')
            expect(caret).toEqual([2, 5])
          })
        })
      })
      describe('jumping backward', () => {
        it('selects on the same line', () => {
          return selectLeft([1, 10], [1, 13]).jump(1, 5, (text, caret) => {
            expect(text).toBe('s is some')
            expect(caret).toEqual([1, 5])
          })
        })
        it('selects on multiline', () => {
          return selectLeft([2, 3], [2, 6]).jump(1, 12, (text, caret) => {
            expect(text).toBe('me example\n  multi')
            expect(caret).toEqual([1, 12])
          })
        })
      })
    })
  })
})
