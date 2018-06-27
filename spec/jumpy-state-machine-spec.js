'use babel'

import {createStateMachine} from '../dist/state-machine'

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

fdescribe('jumpy state machine', () => {
  let fsm
  let adapter
  let visibleLabelsLength
  beforeEach(() => {
    visibleLabelsLength = {before: 9, after: 3}
    adapter = mockAdapter([
      'grabKeyboard',
      'releaseKeyboard',
      function createLabels(data) {
        return {...data, visibleLabels: {length: visibleLabelsLength.before}}
      },
      'destroyLabels',
      function filterLabels(data) {
        return {...data, visibleLabels: {length: visibleLabelsLength.after}}
      },
      'jump',
      'statusIdle',
      'statusReset',
      'statusMatch',
      'statusNoMatch',
    ])
    fsm = createStateMachine({numKeys: 2, adapter})
  })

  const focus = async (before, after) => {
    adapter.calls = []
    await before()
    const state = fsm.getFirstState()
    const {calls} = adapter
    return after(state, calls)
  }

  const focusPartialMatch = (before, after) => () => {
    fsm.activate()
    visibleLabelsLength.after = visibleLabelsLength.before - 1
    fsm.key('a')
    return focus(before, after)
  }

  const focusNoMatch = (before, after) => () => {
    fsm.activate()
    visibleLabelsLength.after = visibleLabelsLength.before
    fsm.key('a')
    return focus(before, after)
  }

  const expectJumpTransition = (state, calls) => {
    expect(state).toBe('idle')
    expect(calls).toEqual([
      'filterLabels',
      'releaseKeyboard',
      'destroyLabels',
      'statusIdle',
      'jump',
    ])
  }

  it('activates', () => {
    fsm.activate()
    expect(fsm.getFirstState()).toBe('input.first_key')
    expect(adapter.calls).toEqual([
      'grabKeyboard',
      'createLabels',
    ])
  })

  it('goes from first_key to partial_match', () => {
    fsm.activate()
    adapter.calls = []
    fsm.key('a')
    expect(fsm.getFirstState()).toBe('input.partial_match')
    expect(adapter.calls).toEqual([
      'filterLabels',
      'statusMatch',
    ])
  })

  it('goes from first_key to no_match', () => {
    visibleLabelsLength.after = visibleLabelsLength.before
    fsm.activate()
    return focus(() => {
      fsm.key('a')
    }, (state, calls) => {
      expect(state).toBe('input.no_match')
      expect(calls).toEqual([
        'filterLabels',
        'statusNoMatch',
      ])
    })
  })

  it('goes from partial_match to no_match', focusPartialMatch(() => {
    visibleLabelsLength.after = visibleLabelsLength.before
    fsm.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    expect(calls).toEqual([
      'filterLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to no_match', focusNoMatch(() => {
    fsm.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    expect(calls).toEqual([
      'filterLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to partial_match', focusNoMatch(() => {
    visibleLabelsLength.after = visibleLabelsLength.before - 1
    fsm.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.partial_match')
    expect(calls).toEqual([
      'filterLabels',
      'statusMatch',
    ])
  }))

  it('goes from partial_match to jump', focusPartialMatch(() => {
    visibleLabelsLength.after = 1
    fsm.key('b')
  }, expectJumpTransition))

  it('goes from no_match to jump', focusPartialMatch(() => {
    // then no match
    visibleLabelsLength.after = visibleLabelsLength.before
    fsm.key('b')
  }, state => {
    expect(state).toBe('input.no_match')
    // then final match
    return focus(() => {
      visibleLabelsLength.after = 1
      fsm.key('c')
    }, expectJumpTransition)
  }))

  // reset
  {
    const reset = () => {
      fsm.reset()
    }

    const expectResetTransition = (state, calls) => {
      expect(state).toBe('input.first_key')
      expect(calls).toEqual([
        // 'resetKeys', // internal
        'filterLabels',
      ])
    }

    it('resets from first_key', () => {
      fsm.activate()
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
  }

  describe('with 3 keys', () => {
    beforeEach(() => {
      fsm = createStateMachine({numKeys: 3, adapter})
    })

    it('goes from partial_match to partial_match', () => {
      fsm.activate()
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      fsm.key('a')
      return focus(() => {
        visibleLabelsLength.after = visibleLabelsLength.after - 1
        fsm.key('b')
      }, (state, calls) => {
        expect(state).toBe('input.partial_match')
        expect(calls).toEqual([
          'filterLabels',
          'statusMatch',
        ])
      })
    })

    it('goes from partial_match to jump', () => {
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      fsm.activate()
      fsm.key('a')
      fsm.key('b')
      return focus(() => {
        visibleLabelsLength.after = 1
        fsm.key('c')
      }, expectJumpTransition)
    })

    it('goes from no_match to jump', () => {
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      fsm.activate()
      fsm.key('a')
      fsm.key('b')
      visibleLabelsLength.after = visibleLabelsLength.before
      fsm.key('c')
      expect(fsm.getFirstState()).toBe('input.no_match')
      return focus(() => {
        visibleLabelsLength.after = 1
        fsm.key('d')
      }, expectJumpTransition)
    })
  })
})
