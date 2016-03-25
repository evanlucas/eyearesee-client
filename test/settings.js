'use strict'

const test = require('tap').test
const Settings = require('../lib/settings')

test('Settings', (t) => {
  const defs = new Map([
    ['a', 'b']
  ])

  const o = {}
  const s = new Settings(defs, o)
  t.type(s, Settings)
  t.type(s._map, Map)
  t.type(s._defaults, Map)

  s.on('settingChanged', (k, orig, val) => {
    t.equal(k, 'b', 'key')
    t.equal(orig, undefined, 'original value')
    t.equal(val, 'c', 'new value')
  })

  s.set('b', 'c')

  s.removeAllListeners('settingChanged')

  s.on('settingChanged', (k, orig, val) => {
    t.fail('should not have fired')
  })

  s.set('b', 'c')

  t.equal(s.get('b'), 'c', 'get works when hitting the _map')
  t.equal(s.get('a'), 'b', 'get works when using defaults')

  t.deepEqual(s.toJSON(), {
    b: 'c'
  }, 'toJSON() works')

  s.load({
    a: 'c'
  })

  t.equal(s.get('a'), 'c', 'get works after load')
  t.equal(s.getConnection(), o, 'getConnection() works')

  const b = new Settings()
  t.type(b._defaults, Map)
  t.end()
})
