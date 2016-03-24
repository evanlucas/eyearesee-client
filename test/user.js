'use strict'

const test = require('tap').test
const User = require('../').User

test('User', (t) => {
  const opts = {
    nickname: 'evan'
  , username: 'evan'
  , address: 'unaffiliated'
  , realname: 'Evan Lucas'
  , mode: '+v'
  , color: 'red1'
  }

  const u = new User(opts)
  t.deepEqual(u, opts)
  t.end()
})
