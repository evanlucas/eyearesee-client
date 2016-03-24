'use strict'

const test = require('tap').test
const Message = require('../').Message

test('Message', (t) => {
  t.plan(11)
  const ts = new Date()
  var m
  const opts = {
    message: 'This is a test'
  , hostmask: {}
  , channel: '#biscuits'
  , ts: ts
  , connection: {
      messageFormatter: formatter
    }
  }

  m = new Message(opts)
  t.equal(m.formatted, 'This is a biscuit', 'formatted')
  t.equal(m.message, 'This is a test', 'message')
  t.equal(m.to, '', 'to')
  t.equal(m.from, '', 'from')
  t.equal(m.mention, false, 'mention')
  t.equal(m.type, 'message', 'type')
  t.equal(m.channel, '#biscuits', 'channel')
  t.equal(m.ts, ts, 'ts')
  t.equal(m.getConnection(), opts.connection, 'connection')

  function formatter(msg) {
    t.pass('called formatter')
    t.type(msg, Message)
    return msg.message.replace('test', 'biscuit')
  }
})
