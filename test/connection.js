'use strict'

const test = require('tap').test
const Connection = require('../').Connection
const Message = require('../').Message
const Settings = require('../').Settings
const Socket = require('../').Socket

test('Connection', (t) => {
  t.throws(() => {
    new Connection()
  }, /opts.name is required/)

  t.throws(() => {
    new Connection({
      name: 'test'
    })
  }, /opts.user is required and must be an object/)

  t.throws(() => {
    new Connection({
      name: 'test'
    , user: {}
    })
  }, /opts.user.nickname is required and must be a string/)

  t.throws(() => {
    new Connection({
      name: 'test'
    , user: {
        nickname: 'test'
      }
    })
  }, /opts.server is required and must be an object/)

  t.throws(() => {
    new Connection({
      name: 'test'
    , user: {
        nickname: 'test'
      }
    , server: {}
    })
  }, /opts.server.host is required and must be a string/)

  const writeOrig = Socket.prototype.write
  Socket.prototype.write = function(chunk) {
    Socket.prototype.write = writeOrig
    t.pass('called Socket#write for the query')
    t.equal(chunk, 'WHOIS NickServ', 'message is correct')
  }

  let logCount = 0
  let msgCount = 0

  const conn = new Connection({
    name: 'Freenode'
  , user: {
      username: 'evan'
    , nickname: 'evan'
    , altNick: 'eva_'
    , realname: 'Evan Lucas'
    }
  , server: {
      host: '127.0.0.1'
    , port: 10001
    , secure: false
    }
  , channels: [
      { name: '#biscuits'
      , topic: 'testTopic'
      , type: 'channel'
      }
    ]
  , queries: [
      { name: 'NickServ'
      , topic: 'Conversation with NickServ'
      , from: 'NickServ'
      , nick: 'evanlucas'
      , type: 'private'
      }
    ]
  , settings: {
      'log.events': false
    }
  })

  t.equal(conn.name, 'Freenode', 'name')
  t.equal(conn.url, '/connections/Freenode', 'url')
  t.type(conn.channels, Map)
  t.type(conn.queries, Map)
  t.equal(conn.ele, '.logs-container')
  t.type(conn.settings, Settings)
  t.type(conn.logs, Array)
  t.type(conn._panels, Map)
  t.equal(conn.settings.get('log.events'), false, 'settings preload')
  t.type(conn.socket, Socket)
  t.equal(conn.getConnection(), conn, 'getConnection()')

  let chan = conn.channels.get('#biscuits')
  const chanAdded = conn.addChannel(chan)
  t.equal(chan, chanAdded, 'addChannel returns the channel if exists')

  chan = conn.queries.get('nickserv')
  const qAdded = conn.addQuery(chan)
  t.equal(chan, qAdded, 'addQuery returns the query if exists')

  t.deepEqual(conn.toJSON(), {
    name: 'Freenode'
  , server: {
      host: '127.0.0.1'
    , port: 10001
    , secure: false
    }
  , user: {
      username: 'evan'
    , nickname: 'evan'
    , realname: 'Evan Lucas'
    , altNick: 'eva_'
    }
  , channels: [
      { name: '#biscuits'
      , type: 'channel'
      , topic: 'testTopic'
      }
    ]
  , queries: [
      { name: 'NickServ'
      , type: 'private'
      , topic: 'Conversation with NickServ'
      }
    ]
  , settings: {
      'log.events': false
    }
  }, 'toJSON() works')

  // send

  conn.write = function(c) {
    conn.write = writeOrig
    t.pass('called write')
    t.equal(c, 'PRIVMSG #biscuits :This is a test')
  }

  conn.send('#biscuits', 'This is a test')

  conn.once('log', (msg) => {
    t.equal(msg.type, 'notice', 'type')
    t.equal(msg.from, 'NickServ', 'from')
    t.equal(msg.message, 'You are now identified for \u0002evan\u0002', 'msg')
  })

  logCount++
  conn.socket.emit('NOTICE', {
    prefix: 'NickServ!NickServ@services.'
  , command: 'NOTICE'
  , params: ['evan']
  , trailing: 'You are now identified for \u0002evan\u0002'
  })

  const q = conn.queries.get('nickserv')
  t.equal(q.messages.length, 1, 'messages.length')

  conn.once('log', (msg) => {
    t.equal(msg.type, 'info', 'type')
    t.equal(msg.from, '', 'from')
    t.equal(msg.message, 'Welcome to the freenode IRC Network evan', 'message')
  })

  logCount++
  conn.socket.emit('RPL_WELCOME', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_WELCOME'
  , params: ['evan']
  , trailing: 'Welcome to the freenode IRC Network evan'
  })

  // PING/PONG
  conn.write = function(chunk) {
    conn.write = writeOrig
    t.equal(chunk, 'PONG :message', 'write chunk')
  }

  conn.socket.emit('PING', {
    trailing: 'message'
  })

  conn.once('log', (msg) => {
    t.equal(msg.type, 'motd', 'type')
    t.equal(msg.from, '', 'from')
    t.equal(msg.message, '- Message of the Day -', 'message')
  })

  logCount++
  conn.socket.emit('RPL_MOTDSTART', {
    command: 'RPL_MOTDSTART'
  , params: ['evan']
  , trailing: '- Message of the Day -'
  , prefix: 'rajaniemi.freenode.net'
  })

  conn.once('whois', (msg) => {
    t.deepEqual(msg, {
      nickname: 'NickServ'
    , username: 'NickServ'
    , hostname: 'services.'
    , realname: 'Nickname Services'
    , channels: ['#biscuits']
    , oper: true
    , server: 'services.'
    }, 'whois')
  })

  conn.socket.emit('RPL_WHOISUSER', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_WHOISUSER'
  , params: ['evan', 'NickServ', 'NickServ', 'services.', '*']
  , trailing: 'Nickname Services'
  })

  conn.socket.emit('RPL_WHOISSERVER', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_WHOISSERVER'
  , params: ['evan', 'NickServ', 'services.']
  , trailing: 'Atheme IRC Services'
  })

  conn.socket.emit('RPL_WHOISCHANNELS', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_WHOISCHANNELS'
  , params: ['evan', 'NickServ']
  , trailing: '#biscuits'
  })

  conn.socket.emit('RPL_WHOISOPERATOR', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_WHOISOPERATOR'
  , params: ['evan', 'NickServ']
  })

  conn.socket.emit('RPL_ENDOFWHOIS', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_ENDOFWHOIS'
  , params: ['evan', 'NickServ']
  , trailing: ''
  })

  conn.once('log', (msg) => {
    t.equal(msg.type, 'info', 'type')
    t.equal(msg.from, '', 'from')
    t.equal(msg.message, 'unaway: You are marked as being away', 'msg')
  })


  logCount++
  conn.socket.emit('RPL_UNAWAY', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_UNAWAY'
  , params: []
  , trailing: 'You are marked as being away'
  })

  chan = conn.channels.get('#biscuits')

  conn.once('channelUpdated', (c) => {
    t.equal(c, chan, 'got channelUpdated event')
  })

  conn.socket.emit('RPL_CHANNELMODEIS', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_CHANNELMODEIS'
  , params: ['#biscuits', '+ns']
  })

  conn.socket.emit('RPL_CHANNELMODEIS', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_CHANNELMODEIS'
  , params: ['evan', '#biscuits', '+ns']
  })

  t.equal(chan.mode, '+ns', 'channel mode')
  t.equal(chan.messages.length, ++msgCount, 'messages.length')

  conn.once('channelUpdated', (c) => {
    t.equal(c, chan, 'got channelUpdated event')
  })

  conn.socket.emit('RPL_TOPIC_WHO_TIME', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_TOPIC_WHO_TIME'
  , params: [
      'evan'
    , '#biscuits'
    , 'evan!~evan@unaffiliated/evan'
    , '1458784480'
    ]
  , trailing: ''
  })

  conn.socket.emit('RPL_TOPIC_WHO_TIME', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_TOPIC_WHO_TIME'
  , params: [
      'evan'
    , '#biscuits'
    , 'evan!~evan@unaffiliated/evan'
    , '1458784480'
    ]
  , trailing: ''
  })

  conn.socket.emit('RPL_TOPIC_WHO_TIME', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_TOPIC_WHO_TIME'
  , params: [
      'evan'
    , '#biscuits-'
    , 'evan!~evan@unaffiliated/evan'
    , '1458784480'
    ]
  , trailing: ''
  })

  t.equal(chan.messages.length, ++msgCount, 'messages.length')

  conn.once('channelUpdated', (c) => {
    t.equal(c, chan, 'got channelUpdated event')
  })

  conn.write = function(chunk) {
    conn.write = writeOrig
    t.equal(chunk, 'MODE #biscuits', 'write chunk')
    logCount++
  }

  conn.socket.emit('TOPIC', {
    prefix: 'evan!~evan@unaffiliated/evan'
  , command: 'TOPIC'
  , params: ['#biscuits']
  , trailing: 'BISCUITS'
  })

  t.equal(chan.topic, 'BISCUITS', 'topic')
  t.equal(chan.messages.length, ++msgCount, 'messages.length')

  t.equal(conn.logs.length, logCount++, 'logs.length')

  t.equal(chan.joined, false, 'chan.joined')

  conn.once('channelUpdated', (c) => {
    t.equal(c, chan, 'got channelUpdated event')
    t.equal(chan.joined, true, 'chan.joined')
  })

  conn.socket.emit('JOIN', {
    prefix: 'evan!~evan@unaffiliated/evan'
  , command: 'JOIN'
  , params: ['#biscuits']
  , trailing: ''
  })

  conn.write = function(chunk) {
    conn.write = writeOrig
    t.equal(chunk, 'WHO #biscuits', 'write chunk')
  }

  conn.socket.emit('RPL_NAMREPLY', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_NAMREPLY'
  , params: ['evan', '=', '#biscuits']
  , trailing: 'evan anotherUser'
  })

  conn.socket.emit('RPL_NAMREPLY', {
    prefix: 'rajaniemi.freenode.net'
  , command: 'RPL_NAMREPLY'
  , params: ['evan', '=', '#biscuits-']
  , trailing: 'evan anotherUser'
  })

  t.equal(chan.users.size, 2, 'chan.users.size')

  conn.write = function(chunk) {
    conn.write = writeOrig
    t.equal(chunk, 'NAMES #biscuits evan')
  }

  conn.once('channelUpdated', (c) => {
    t.equal(c, chan, 'got channelUpdated event')
  })

  conn.socket.emit('MODE', {
    prefix: 'ChanServ!ChanServ@services.'
  , command: 'MODE'
  , params: ['#biscuits', '+o', 'evan']
  , trailing: ''
  })

  t.equal(chan.messages.length, ++msgCount, 'messages.length')

  conn.socket.emit('MODE', {
    prefix: 'ChanServ!ChanServ@services.'
  , command: 'MODE'
  , params: ['#biscuits-', '+o', 'evan']
  , trailing: ''
  })

  t.equal(chan.messages.length, msgCount, 'messages.length')

  conn.once('invite', (msg) => {
    t.equal(msg.from, 'anotherUser', 'from')
    t.equal(msg.to, 'evan', 'to')
    t.equal(msg.channel, '#channel2', 'channel')
    t.deepEqual(msg.hostmask, {
      nick: 'anotherUser'
    , username: '~anotherUser'
    , hostname: 'unaffiliated/anotherUser'
    , string: 'anotherUser!~anotherUser@unaffiliated/anotherUser'
    }, 'hostmask')
  })

  conn.socket.emit('INVITE', {
    prefix: 'anotherUser!~anotherUser@unaffiliated/anotherUser'
  , command: 'INVITE'
  , params: ['evan']
  , trailing: '#channel2'
  })

  conn.once('channelUpdated', (c) => {
    const a = conn.queries.get('anotheruser')
    t.equal(c, a, 'got channelUpdated event')
  })

  conn.write = function(chunk) {
    conn.write = writeOrig
    t.equal(chunk, 'WHOIS anotherUser')
  }

  conn.socket.emit('PRIVMSG', {
    prefix: 'anotherUser!~anotherUser@unaffiliated/anotherUser'
  , command: 'PRIVMSG'
  , params: ['evan']
  , trailing: '\u0001ACTIONThis is a test\u0001'
  })

  const query = conn.queries.get('anotheruser')
  t.equal(query.messages.length, 1, 'messages.length')
  const m = query.messages[0]
  t.equal(m.message, 'This is a test')

  chan.once('log', (msg) => {
    t.type(msg, Message)
    t.equal(msg.type, 'action', 'type')
    t.equal(msg.to, '#biscuits', 'to')
    t.equal(msg.from, 'anotherUser', 'from')
    t.equal(msg.channel, chan, 'channel')
    t.equal(msg.mention, false, 'mention')
    t.equal(msg.message, 'This is a test', 'message')
  })


  conn.socket.emit('PRIVMSG', {
    prefix: 'anotherUser!~anotherUser@unaffiliated/anotherUser'
  , command: 'PRIVMSG'
  , params: ['#biscuits']
  , trailing: '\u0001ACTIONThis is a test\u0001'
  })

  conn.socket.emit('NICK', {
    prefix: 'anotherUser!~anotherUser@unaffiliated/anotherUser'
  , command: 'NICK'
  , params: []
  , trailing: 'anotherUser2'
  })

  conn.socket.emit('NICK', {
    prefix: 'evan!~evan@unaffiliated/evan'
  , command: 'NICK'
  , params: []
  , trailing: 'eva_'
  })

  t.equal(conn.nick, 'eva_', 'nick is updated')

  // These should be last
  conn.once('channelRemoved', (m) => {
    t.pass('got channelRemoved event')
    t.equal(m, chan, 'the channel is correct')
  })

  conn.removeChannel('#biscuits')
  conn.removeChannel('#biscuits')

  conn.once('queryRemoved', (m) => {
    t.pass('got queryRemoved event')
    t.equal(m, query, 'the query is correct')
  })

  conn.removeQuery('anotherUser2')
  conn.removeQuery('anotherUser')

  t.end()
})
