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

describe('jumpy state machine', () => {
  let stateMachine
  let api
  let adapter
  let visibleLabelsLength
  beforeEach(() => {
    visibleLabelsLength = {before: 9, after: 3}
    adapter = mockAdapter([
      'focus',
      'blur',
      'grabKeyboard',
      'releaseKeyboard',
      function createLabels(data) {
        return {...data, visibleLabels: Array(visibleLabelsLength.before)}
      },
      'destroyLabels',
      function filterLabels(data) {
        return {...data, visibleLabels: Array(visibleLabelsLength.after)}
      },
      'updateLabels',
      'jump',
      'statusIdle',
      'statusReset',
      'statusMatch',
      'statusNoMatch',
    ])
    const config = parseConfig({numKeys: 2})
    stateMachine = createStateMachine({config, adapter})
    api = stateMachine.api
  })

  const focus = async (before, after) => {
    adapter.calls = []
    await before()
    const state = stateMachine.getStatePath()
    const {calls} = adapter
    return after(state, calls)
  }

  const focusPartialMatch = (before, after) => () => {
    api.activate()
    visibleLabelsLength.after = visibleLabelsLength.before - 1
    api.key('a')
    return focus(before, after)
  }

  const focusNoMatch = (before, after) => () => {
    api.activate()
    visibleLabelsLength.after = visibleLabelsLength.before
    api.key('a')
    return focus(before, after)
  }

  const expectJumpTransition = (state, calls) => {
    expect(state).toBe('idle')
    expect(calls).toEqual([
      'filterLabels',
      'updateLabels',
      'blur',
      'releaseKeyboard',
      'destroyLabels',
      'statusIdle',
      'jump',
    ])
  }

  it('activates', () => {
    api.activate()
    expect(stateMachine.getStatePath()).toBe('input.first_key')
    expect(adapter.calls).toEqual([
      'focus',
      'grabKeyboard',
      'createLabels',
    ])
  })

  it('goes from first_key to partial_match', () => {
    api.activate()
    return focus(() => {
      api.key('a')
    }, (state, calls) => {
      expect(state).toBe('input.partial_match')
      expect(calls).toEqual([
        'filterLabels', // internal, not recorded
        'updateLabels',
        'statusMatch',
      ])
    })
  })

  it('goes from first_key to no_match', () => {
    visibleLabelsLength.after = visibleLabelsLength.before
    api.activate()
    return focus(() => {
      api.key('a')
    }, (state, calls) => {
      expect(state).toBe('input.no_match')
      console.log(calls)
      expect(calls).toEqual([
        'filterLabels',
        'updateLabels',
        'statusNoMatch',
      ])
    })
  })

  it('goes from partial_match to no_match', focusPartialMatch(() => {
    visibleLabelsLength.after = visibleLabelsLength.before
    api.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    expect(calls).toEqual([
      'filterLabels',
      'updateLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to no_match', focusNoMatch(() => {
    api.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.no_match')
    console.log(calls)
    expect(calls).toEqual([
      'filterLabels',
      'updateLabels',
      'statusNoMatch',
    ])
  }))

  it('goes from no_match to partial_match', focusNoMatch(() => {
    visibleLabelsLength.after = visibleLabelsLength.before - 1
    api.key('b')
  }, (state, calls) => {
    expect(state).toBe('input.partial_match')
    expect(calls).toEqual([
      'filterLabels',
      'updateLabels',
      'statusMatch',
    ])
  }))

  it('goes from partial_match to jump', focusPartialMatch(() => {
    visibleLabelsLength.after = 1
    api.key('b')
  }, expectJumpTransition))

  it('goes from no_match to jump', focusPartialMatch(() => {
    // then no match
    visibleLabelsLength.after = visibleLabelsLength.before
    api.key('b')
  }, state => {
    expect(state).toBe('input.no_match')
    // then final match
    return focus(() => {
      visibleLabelsLength.after = 1
      api.key('c')
    }, expectJumpTransition)
  }))

  // reset
  {
    const reset = () => {
      api.reset()
    }

    const expectResetTransition = (state, calls) => {
      expect(state).toBe('input.first_key')
      expect(calls).toEqual([
        // 'resetKeys', // internal
        'filterLabels',
        'updateLabels',
      ])
    }

    it('resets from first_key', () => {
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
  }

  // back
  {
    it('backs from first_key to idle', () => {
      api.activate()
      focus(() => {
        api.back()
      }, (state, calls) => {
        expect(state).toBe('idle')
        expect(calls).toEqual([
          'blur',
          'releaseKeyboard',
          'destroyLabels',
          'statusIdle',
        ])
      })
    })

    it('backs from partial_match to first_key', focusPartialMatch(() => {
      api.back()
    }, (state, calls) => {
      expect(state).toBe('input.first_key')
      expect(calls).toEqual([
        'filterLabels',
        'updateLabels',
      ])
    }))

    it('backs from no_match to first_key', focusNoMatch(() => {
      api.back()
    }, (state, calls) => {
      expect(state).toBe('input.first_key')
      expect(calls).toEqual([
        'filterLabels',
        'updateLabels',
      ])
    }))
  }

  describe('with 3 keys', () => {
    beforeEach(() => {
      const config = parseConfig({numKeys: 3})
      stateMachine = createStateMachine({config, adapter})
      api = stateMachine.api
    })

    it('goes from partial_match to partial_match', () => {
      api.activate()
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      api.key('a')
      return focus(() => {
        visibleLabelsLength.after = visibleLabelsLength.after - 1
        api.key('b')
      }, (state, calls) => {
        expect(state).toBe('input.partial_match')
        expect(calls).toEqual([
          'filterLabels',
          'updateLabels',
          'statusMatch',
        ])
      })
    })

    it('goes from partial_match to jump', () => {
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      api.activate()
      api.key('a')
      visibleLabelsLength.after--
      api.key('b')
      return focus(() => {
        visibleLabelsLength.after = 1
        api.key('c')
      }, expectJumpTransition)
    })

    it('goes from no_match to jump', () => {
      visibleLabelsLength.after = visibleLabelsLength.before - 1
      api.activate()
      api.key('a')
      expect(stateMachine.getStatePath()).toBe('input.partial_match')
      visibleLabelsLength.after--
      api.key('b')
      expect(stateMachine.getStatePath()).toBe('input.partial_match')
      visibleLabelsLength.after = visibleLabelsLength.before
      api.key('c')
      expect(stateMachine.getStatePath()).toBe('input.no_match')
      return focus(() => {
        visibleLabelsLength.after = 1
        api.key('d')
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
      delete adapter.filterLabels
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
