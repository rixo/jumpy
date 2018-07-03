'use babel'

const code = `
  this is some example
  multiline text
with
  more
lines
`

describe('jumpy visual mode selection', () => {
  let editor
  // vim emulation is not top notch yet
  let hasVim = false

  const toggle = () => {
    const workspace = atom.views.getView(atom.workspace)
    return Promise.all([
      atom.packages.activatePackage('jumpy'),
      atom.commands.dispatch(workspace, 'jumpy:toggle'),
    ]).then(() => {
      const pack = atom.packages.getActivePackage('jumpy')
      const jumpy = pack.mainModule
      const stateMachine = jumpy.core.getStateMachine()
      return stateMachine
    })
  }

  beforeEach(async () => {
    try {
      await atom.packages.activatePackage('vim-mode-plus')
      hasVim = true
    } catch (err) {}
  })

  const mockVisualMode = () => {
    if (!editor) {
      throw new Error('Failed to find TextEditor')
    }
    editor.element.classList.add('visual-mode')
  }

  const dispatch = cmd => atom.commands.dispatch(editor.element, cmd)

  const dispatchVim = async (count, cmd) => {
    if (!hasVim) {
      pending('vim-mode-plus is not available')
      return
    }
    if (cmd === undefined) {
      cmd = count
    } else {
      for (const char of String(count)) {
        await dispatch(`vim-mode-plus:set-count-${char}`)
      }
    }
    return dispatch('vim-mode-plus:' + cmd)
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

  const selectLinewise = async (fromRow, toPoint) => {
    editor.setCursorBufferPosition(toPoint)
    editor.setSelectedBufferRange([
      [fromRow, 0],
      editor.clipBufferPosition([toPoint[0], Number.MAX_SAFE_INTEGER]),
    ])
    await dispatchVim(fromRow + 1, 'move-to-first-line')
    await dispatchVim('activate-linewise-visual-mode')
    await dispatchVim(toPoint[0] + 1, 'move-to-first-line')
    await dispatchVim(toPoint[1] + 1, 'move-to-column')
    return {jump}
  }

  const jump = (row, col, callback) => {
    atom.config.set('jumpy.matchPattern', '.')
    atom.config.set('jumpy.useBuiltInRegexMatchAllTheThings', false)
    const promise = toggle().then(stateMachine => {
      const {api, data: {visibleLabels}} = stateMachine
      const label = visibleLabels.find(
        ({lineNumber, column}) => row === lineNumber && col === column
      )
      if (!label) {
        throw new Error(`No label at ${row}:${col}`)
      }
      Array.from(label.keyLabel).forEach(key => {
        api.key(key)
      })
      if (callback) {
        const text = editor.getSelectedText()
        const {row, column} = editor.getCursorBufferPosition()
        return callback(text, [row, column])
      }
    })
    promise.jump = (...args) => promise.then(() => jump(...args))
    return promise
  }

  beforeEach(async () => {
    const workspaceElement = atom.views.getView(atom.workspace)
    workspaceElement.style.height = '5000px'
    workspaceElement.style.width = '5000px'
    jasmine.attachToDOM(workspaceElement)
    await atom.workspace.open()
    editor = atom.workspace.getActiveTextEditor()
    editor.setText(code)
    await new Promise(resolve => requestAnimationFrame(resolve))
  })

  //////////////////////////////////////////////////////////////////////////////
  //
  // It selects from origin char included to target char included.
  //
  //   0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22
  // 0
  // 1       t  h  i  s     i  s     s  o  m  e     e  x  a  m  p  l  e
  // 2       m  u  l  t  i  l  i  n  e     t  e  x  t
  // 3 w  i  t  h
  // 4    m  o  r  e
  // 5 l  i  n  e  s
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
        it('selects when coming back between origin and a later row', () => {
          return selectRight([1, 7], [3, 3]).jump(2, 6, (text, caret) => {
            expect(text).toBe('is some example\n  multi')
            expect(caret).toEqual([2, 7])
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
        it('selects when coming back from upper selection', () => {
          return selectLeft([1, 15], [4, 4]).jump(3, 2, (text, caret) => {
            expect(text).toBe('th\n  mor')
            expect(caret).toEqual([3, 2])
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

  //////////////////////////////////////////////////////////////////////////////
  //   0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22
  // 0
  // 1       t  h  i  s     i  s     s  o  m  e     e  x  a  m  p  l  e
  // 2       m  u  l  t  i  l  i  n  e     t  e  x  t
  // 3 w  i  t  h
  // 4    m  o  r  e
  // 5 l  i  n  e  s
  // 6
  //
  describe('in linewise mode', () => {
    const tests = [{
      title: 'selects on the same line before',
      selectFromRow: 2,
      startPoint: [2, 3],
      jumps: [[2, 3]],
      expect: [2, 2],
    }, {
      title: 'selects on the same line after',
      selectFromRow: 2,
      startPoint: [2, 3],
      jumps: [[2, 1]],
      expect: [2, 2],
    }, {
      title: 'selects on the line before',
      selectFromRow: 2,
      startPoint: [2, 6],
      jumps: [[1, 4]],
      expect: [1, 2],
    }, {
      title: 'selects two lines before',
      selectFromRow: 4,
      startPoint: [4, 3],
      jumps: [[2, 7]],
      expect: [2, 4],
    }, {
      title: 'selects two lines before then one before',
      selectFromRow: 4,
      startPoint: [4, 5],
      jumps: [[2, 6], [1, 0]],
      expect: [1, 4],
    }, {
      title: 'selects 3 before then 2 after',
      selectFromRow: 5,
      startPoint: [4, 3],
      jumps: [[1, 2], [3, 3]],
      expect: [3, 4],
    }, {
      title: 'selects on the line after',
      selectFromRow: 3,
      startPoint: [3, 2],
      jumps: [[4, 4]],
      expect: [3, 4],
    }, {
      title: 'selects two line after',
      selectFromRow: 3,
      startPoint: [3, 1],
      jumps: [[5, 2]],
      expect: [3, 5],
    }, {
      title: 'selects two lines after then one after',
      selectFromRow: 1,
      startPoint: [1, 7],
      jumps: [[3, 0], [4, 1]],
      expect: [1, 4],
    }, {
      title: 'selects 3 after then 2 before',
      selectFromRow: 2,
      startPoint: [2, 0],
      jumps: [[5, 3], [3, 3]],
      expect: [2, 3],
    }, {
      title: 'selects 2 before then 4 after',
      selectFromRow: 3,
      startPoint: [3, 1],
      jumps: [[1, 1], [5, 3]],
      expect: [3, 5],
    }, {
      title: 'selects 4 before then 2 after',
      selectFromRow: 5,
      startPoint: [5, 2],
      jumps: [[1, 1], [3, 1]],
      expect: [3, 5],
    }, {
      title: 'selects 2 after then on the same',
      selectFromRow: 2,
      startPoint: [2, 10],
      jumps: [[4, 0], [2, 8]],
      expect: [2, 2],
    }, {
      title: 'selects 2 before then on the same',
      selectFromRow: 3,
      startPoint: [3, 1],
      jumps: [[1, 11], [3, 3]],
      expect: [3, 3],
    }]

    const lines = ([first, last]) => code
        .split('\n')
        .slice(first, last + 1)
        .map(row => row + '\n')
        .join('')

    tests.forEach(({
      focus,
      skip,
      title,
      selectFromRow,
      startPoint,
      jumps,
      expect: expected,
    }) => {
      const cursorTitle = `${title} and fix column`
      if (!expected) {
        xit(title)
        xit(cursorTitle)
        return
      }
      const lastJump = jumps[jumps.length - 1]
      const run = async () => {
        await selectLinewise(selectFromRow, startPoint)
        for (const jp of jumps.slice(0, -1)) {
          await jump(...jp)
        }
        const result = {}
        await jump(...lastJump, (text, cursor) => {
          result.text = text
          result.cursor = cursor
        })
        return result
      }

      const fn = focus ? ffit : (skip ? xit : it)
      fn(title, async () => {
        const {text} = await run()
        expect(text).toBe(lines(expected))
      })

      fn(cursorTitle, async () => {
        await run()
        // needed because during visual mode, editor's cursor
        // position is not reliable (and maybe in order to queue
        // after the commands dispatched during the jump)
        await dispatchVim('create-persistent-selection')
        const cursor = editor.getCursorBufferPosition()
        expect(cursor).toEqual(lastJump)
      })
    })
  })
})
