'use strict'

const net = require('net')
const test = require('tap').test
const Socket = require('../').Socket
const Split = require('../lib/irc-split')

let netServer
let port

test('setup', (t) => {
  netServer = net.createServer().on('error', t.fail)
  netServer.listen(0, () => {
    port = netServer.address().port
    t.end()
  })
})

test('Socket', (t) => {
  t.plan(18)
  const s1 = new Socket({
    secure: true
  })

  t.type(s1, Socket)
  t.equal(s1.opts.secure, true, 'secure')
  t.equal(s1.opts.port, 6697, 'port')
  t.equal(s1.connected, false, 'connected === false')

  const s2 = new Socket({
    secure: false
  })

  t.type(s2, Socket)
  t.equal(s2.opts.secure, false, 'secure')
  t.equal(s2.opts.port, 6667, 'port')
  t.equal(s2.connected, false, 'connected === false')

  const s = new Socket({
    secure: false
  , port: port
  , password: 'abcd'
  , nickname: 'evan'
  , username: 'evan'
  , realname: 'Evan Lucas'
  , altNick: 'evao'
  })

  const m = ':wolfe.freenode.net NOTICE * :*** Looking up your hostname...\r\n'

  netServer.on('connection', (conn) => {
    const ar = [
      'PASS abcd'
    , 'NICK evan'
    , 'USER evan 0 * :Evan Lucas'
    , 'NICK evao'
    , 'NICK evap'
    ]

    let count = 0

    s.on('NOTICE', (msg) => {
      t.equal(msg.command, 'NOTICE', 'command')
      if (count === 4) {
        conn.write('ERR_NICKNAMEINUSE * evao\r\n')
      } else {
        conn.write('ERR_NICKNAMEINUSE * evan\r\n')
      }
    })

    conn.pipe(Split()).on('data', (chunk) => {
      t.equal(chunk.toString(), ar[count++], `chunk ${count}`)
      if (count === 3) {
        conn.write(m)
      } else if (count === 4) {
        t.pass('got 4th')
        conn.write(m)
      } else if (count === 5) {
        t.pass('got 5th')
        conn.destroy()
      }
    })
  })

  s.once('connect', () => {
    t.pass('got connect event')
  })

  s.connect()
})

test('cleanup', (t) => {
  netServer.close(() => {
    t.end()
  })
})
