'use babel'

import {createStateMachine} from '../dist/state-machine'
import {parseConfig} from '../dist/config'

const mockAdapter = specs => specs.reduce((adapter, name) => {
  if (typeof name === 'function') {
    const handler = name
    name = handler.name
    adapter[name] = (...args) => {
      adapter.calls.push(name)
      return handler(...args)
    }
  } else {
    adapter[name] = (data) => {
      adapter.calls.push(name)
      return data
    }
  }
  return adapter
}, {calls: []})

const mockLabel = keyLabel => ({keyLabel})

describe('jumpy state machine', () => {
  let stateMachine
  let api
  let adapter
  let labels
  beforeEach(() => {
    labels = ['aa', 'ab', 'ba']
    adapter = mockAdapter([
      'focus',
      'blur',
      'grabKeyboard',
      'releaseKeyboard',
      function createLabels(data) {
        const l = labels.map(mockLabel)
        return {...data, labels: l, visibleLabels: l, hiddenLabels: []}
      },
      'destroyLabels',
      'updateLabels',
      'jump',
      'flashNoMatch',
      'statusIdle',
      'statusClear',
      'statusMatch',
      'statusNoMatch',
    ])
    const config = parseConfig({
      numKeys: 2,
      flashNoMatch: false,
      statusBar: true,
    })
    stateMachine = createStateMachine({config, adapter})
    api = stateMachine.api
  })

  const recordAction = name => {
    adapter[name] = data => {
      adapter.calls.push(name)
      return data
    }
  }

  const focus = async (before, after) => {
    adapter.calls = []
    await before()
    const state = stateMachine.getStatePath()
    const {calls} = adapter
    return after(state, calls)
  }

  const focusPartialMatch = (before, after) => () => {
    api.activate()
    api.key('a')
    return focus(before, after)
  }

  const focusNoMatch = (before, after) => () => {
    api.activate()
    api.key('x')
    return focus(before, after)
  }

  const expectCalls = (calls, actions) => {
    actions.forEach(action => {
      expect(calls).toContain(action)
    })
  }

  const expectJumpTransition = (state, calls) => {
    expect(state).toBe('idle')
    expectCalls(calls, [
      'blur',
      'releaseKeyboard',
      'destroyLabels',
      'statusIdle',
      'jump',
    ])
  }

  it('activates', () => focus(() => {
    api.activate()
  }, (state, calls) => {
    expect(state).toBe('input.wait_key')
    expectCalls(calls, [
      'focus',
      'grabKeyboard',
      'createLabels',
    ])
  }))

  it('does nothing when double activate', () => {
    api.activate()
    const stateBefore = stateMachine.getStatePath()
    return focus(() => {
      api.activate()
    }, (state, calls) => {
      expect(state).toBe(stateBefore)
      expect(calls).toEqual([])
    })
  })

  it('goes from wait_key to partial_match', () => {
    api.activate()
    return focus(() => {
      api.key('a')
    }, (state, calls) => {
      expect(state).toBe('input.partial_match')
      expectCalls(calls, [
        'updateLabels',
        'statusMatch',
      ])
    })
  })

  it('goes from wait_key to no_match', () => {
    api.activate()
    return focus(() => {
      api.key('x')
    }, (state, calls) => {
      expect(state).toBe('input.no_match')
      expectCalls(calls, [
        'updateLabels',
        'statusNoMatch',
      ])
    })
  })

  it('goes from partial_match to no_match', focusPartialMatch(() => {
    api.key('x')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    expectCalls(calls, [
      'updateLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to no_match', focusNoMatch(() => {
    api.key('x')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    expectCalls(calls, [
      'updateLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to partial_match', focusNoMatch(() => {
    api.key('a')
  }, (state, calls) => {
    expect(state).toBe('input.partial_match')
    expectCalls(calls, [
      'updateLabels',
      'statusMatch',
    ])
  }))

  it('goes from partial_match to jump', focusPartialMatch(() => {
    api.key('b')
  }, expectJumpTransition))

  it('goes from no_match to jump', focusPartialMatch(() => {
    // then no match
    api.key('x')
  }, state => {
    expect(state).toBe('input.no_match')
    // then final match
    return focus(() => {
      api.key('b')
    }, expectJumpTransition)
  }))

  describe('reset()', () => {
    const reset = () => {api.reset()}

    const expectResetTransition = (state, calls) => {
      expect(state).toBe('input.wait_key')
      expectCalls(calls, [
        'updateLabels',
        'statusClear',
      ])
    }

    it('resets from wait_key', () => {
      api.activate()
      return focus(reset, expectResetTransition)
    })

    it('resets from partial_match', focusPartialMatch(
      reset,
      expectResetTransition
    ))

    it('resets from no_match', focusNoMatch(
      reset,
      expectResetTransition
    ))
  })

  describe('back()', () => {
    it('backs from no keys to idle', () => {
      api.activate()
      focus(() => {
        api.back()
      }, (state, calls) => {
        expect(state).toBe('idle')
        expectCalls(calls, [
          'blur',
          'releaseKeyboard',
          'destroyLabels',
          'statusIdle',
        ])
      })
    })

    it('backs from partial_match to first key', focusPartialMatch(() => {
      api.back()
    }, (state, calls) => {
      expect(state).toBe('input.wait_key')
      expectCalls(calls, [
        // 'resetKeys',
        // 'resetLabels',
        'updateLabels',
        'statusClear',
      ])
    }))

    it('backs from no_match to first_key', focusPartialMatch(() => {
      // then no match
      api.key('x')
      expect(stateMachine.getStatePath()).toBe('input.no_match')
      // then back
      api.back()
    }, (state, calls) => {
      expect(state).toBe('input.wait_key')
      expectCalls(calls, [
        // 'resetKeys',
        // 'resetLabels',
        'updateLabels',
        'statusClear',
      ])
    }))
  })

  describe('flashNoMatch: false', () => {
    beforeEach(() => {
      stateMachine.data.config.flashNoMatch = false
      recordAction('flashNoMatch')
    })

    it('does not flash on no match', () => {
      api.activate()
      return focus(() => {
        api.key('x')
      }, (state, calls) => {
        expect(calls).not.toContain('flashNoMatch')
      })
    })
  })

  describe('flashNoMatch: true', () => {
    beforeEach(() => {
      stateMachine.data.config.flashNoMatch = true
      recordAction('flashNoMatch')
    })

    it('flashes on initial no match', () => {
      api.activate()
      return focus(() => {
        api.key('x')
      }, (state, calls) => {
        expect(calls).toContain('flashNoMatch')
      })
    })

    it('flashes from partial_match', () => {
      api.activate()
      api.key('a')
      return focus(() => {
        api.key('x')
      }, (state, calls) => {
        expect(calls).toContain('flashNoMatch')
      })
    })

    it('flashs from no_match', () => {
      api.activate()
      api.key('x')
      return focus(() => {
        api.key('x')
      }, (state, calls) => {
        expect(calls).toContain('flashNoMatch')
      })
    })

    it('does not flash on partial match', () => {
      api.activate()
      return focus(() => {
        api.key('a')
      }, (state, calls) => {
        expect(calls).not.toContain('flashNoMatch')
      })
    })
  })

  describe('with 3 keys', () => {
    beforeEach(() => {
      labels = ['aaa', 'abc', 'bab']
      stateMachine.data.config.numKeys = 3
    })

    it('goes from partial_match to partial_match', () => {
      api.activate()
      api.key('a')
      return focus(() => {
        api.key('b')
      }, (state, calls) => {
        expect(state).toBe('input.partial_match')
        expectCalls(calls, [
          'updateLabels',
          'statusMatch',
        ])
      })
    })

    it('goes from partial_match to jump', () => {
      api.activate()
      api.key('a')
      api.key('b')
      return focus(() => {
        api.key('c')
      }, expectJumpTransition)
    })

    it('goes from no_match to jump', () => {
      api.activate()
      api.key('a')
      expect(stateMachine.getStatePath()).toBe('input.partial_match')
      api.key('b')
      expect(stateMachine.getStatePath()).toBe('input.partial_match')
      api.key('x')
      expect(stateMachine.getStatePath()).toBe('input.no_match')
      return focus(() => {
        api.key('c')
      }, expectJumpTransition)
    })

    // TODO
    it('backs from partial_match to partial_match')
    it('backs from partial_match to no_match')
    it('backs from no_match to partial_match')
    it('backs from no_match to no_match')
  })

  describe('filterLabels', () => {
    const labels = ['aa', 'au', 'ba']
      .map(keyLabel => ({keyLabel}))

    beforeEach(() => {
      adapter.createLabels = data => ({
        ...data,
        labels,
        visibleLabels: labels,
        hiddenLabels: [],
      })
    })

    it('keeps matching labels', () => {
      api.activate()
      adapter.updateLabels = data => {
        const labels = data.visibleLabels.map(({keyLabel: s}) => s)
        expect(labels).toEqual(['aa', 'au'])
        expect(data.visible)
      }
      api.key('a')
    })
  })
})
