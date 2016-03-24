'use strict'

const test = require('tap').test
const utils = require('../').utils

test('getTarget()', (t) => {
  t.equal(utils.getTarget(['a']), 'a', 'array 1 item')
  t.equal(utils.getTarget(['a', 'b']), 'a,b', 'array 2 items')
  t.equal(utils.getTarget('a'), 'a', 'string')
  t.end()
})

test('hostmask', (t) => {
  const msg = {
    prefix: 'evan!~evan@unaffiliated/evan'
  }

  t.deepEqual(utils.hostmask(msg), {
    nick: 'evan'
  , username: '~evan'
  , hostname: 'unaffiliated/evan'
  , string: msg.prefix
  })
  t.end()
})
