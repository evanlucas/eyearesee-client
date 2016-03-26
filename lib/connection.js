'use strict'

const EE = require('events')
const Channel = require('./channel')
const Message = require('./message')
const Settings = require('./settings')
const Socket = require('./socket')
const utils = require('./utils')
const debug = require('debug')('eyearesee:connection')
const auth = require('./auth')

const defaultSettings = new Map([
  ['connect.auto', false]
, ['log.events', true]
, ['transcripts.enabled', false]
, ['transcripts.location', null]
, ['part.message', 'eyearesee https://github.com/evanlucas/eyearesee']
, ['persist.password', false]
, ['messages.limit', 300]
, ['channel.join.auto', false]
])

function assertOpts(opts) {
  if (!opts.name) {
    throw new TypeError('opts.name is required')
  }

  if (!opts.user || typeof opts.user !== 'object') {
    throw new TypeError('opts.user is required and must be an object')
  }

  if (!opts.user.nickname || typeof opts.user.nickname !== 'string') {
    throw new TypeError('opts.user.nickname is required and must be a string')
  }

  if (!opts.server || typeof opts.server !== 'object') {
    throw new TypeError('opts.server is required and must be an object')
  }

  if (!opts.server.host || typeof opts.server.host !== 'string') {
    throw new TypeError('opts.server.host is required and must be a string')
  }
}

module.exports = class Connection extends EE {
  constructor(opts) {
    super()

    opts = opts || {}

    assertOpts(opts)

    this.name = opts.name
    this.url = `/connections/${this.name}`

    this.user = opts.user
    this.server = opts.server

    this.nick = opts.user.nickname

    debug('connection', opts)

    // We keep the channels and queries separate so we can show them
    // in separate sections of the sidebar
    this.channels = new Map()
    this.queries = new Map()

    // TODO(evanlucas) Keep track of registration state
    // If a user tries to join a channel that requires registration,
    // try to show that.

    // TODO(evanlucas) change this to irc-connection
    // TODO(evanlucas) get rid of this? This is becoming a implementation
    // detail that should not be leaked from the electron app
    this.ele = '.logs-container'

    // The connection's settings
    this.settings = new Settings(defaultSettings, this)

    if (opts.settings && typeof opts.settings === 'object') {
      this.settings.load(opts.settings)
    }

    // Holds all messages for the connection. These are connection specific
    // and do not include channel messages. They are more infomational messages
    this.logs = []

    // Keep a map of all channels and queries in order.
    // This is done so we can go to the next/previous channel or query
    this._panels = new Map()

    this.messageFormatter = opts.messageFormatter

    /* istanbul ignore next */
    if (this.user.password && this.settings.get('persist.password')) {
      if (this.user.username) {
        auth.saveCreds(this.name, this.user.username, this.user.password)
      }
    }

    this.socket = new Socket({
      secure: opts.secure === true
    , port: opts.server.port
    , host: opts.server.host
    , password: opts.user.password
    , nickname: opts.user.nickname
    , username: opts.user.username
    , realname: opts.user.realname
    , altNick: opts.user.altNick
    })

    if (opts.channels && opts.channels.length) {
      this._addChannels(opts.channels)
    }

    if (opts.queries && opts.queries.length) {
      this._addQueries(opts.queries)
    }

    this._setup()
  }

  _addChannels(chans) {
    for (var i = 0; i < chans.length; i++) {
      const chan = chans[i]
      if (chan.type === 'channel') {
        this.addChannel(chan)
      }
    }
  }

  _addQueries(qs) {
    for (var i = 0; i < qs.length; i++) {
      const q = qs[i]
      if (q.type === 'private') {
        this.addQuery(q)
      }
    }
  }

  getConnection() {
    return this
  }

  _setup() {
    debug('setup')
    this._addMOTDHandlers()
    this._addStartupHandlers()
    this._addWhoisHandlers()
    this._addAwayHandlers()
    this._addChannelHandlers()

    const errHandler = (err) => {
      this.log({
        type: 'error'
      , from: ''
      , message: err.message
      , ts: new Date()
      , channel: null
      })
    }

    this.socket.on('error', errHandler)
    this.socket.on('IRC_ERROR', errHandler)

    this.socket.on('NOTICE', (msg) => {
      debug('NOTICE', msg)
      const hostmask = utils.hostmask(msg)
      const from = hostmask.nick

      if (from && from.toLowerCase() === 'nickserv') {
        const chan = this.addQuery({
          name: 'NickServ'
        , topic: 'Conversation with NickServ'
        })

        chan.addMessage({
          message: msg.trailing
        , type: 'notice'
        , to: this.user.nickname
        , from: 'NickServ'
        })
      }

      this.log({
        type: 'notice'
      , from: from
      , message: msg.trailing
      , ts: new Date()
      , channel: null
      })
    })

    /* istanbul ignore next */
    if (this.settings.get('connect.auto')) {
      debug('autoJoin enabled, connecting')
      this.connect()
    }
  }

  connect() {
    if (!this.connected)
      this.socket.connect()
  }

  _addStartupHandlers() {
    const log = (msg) => {
      let m = msg.trailing
      if (msg.command === 'RPL_WELCOME') {
        if (this.nick !== msg.params[0]) {
          this.updateMyNick(msg.params[0])
        }
      } else if (msg.command === '396') {
        m = `${msg.params[1]} ${msg.trailing}`
      }

      this.log({
        type: 'info'
      , from: ''
      , message: m
      , ts: new Date()
      , channel: null
      })
    }

    this.socket.on('RPL_WELCOME', log)
    this.socket.on('RPL_YOURHOST', log)
    this.socket.on('RPL_CREATED', log)
    this.socket.on('RPL_LUSERCLIENT', log)
    this.socket.on('RPL_LUSERME', log)
    this.socket.on('RPL_LOCALUSERS', log)
    this.socket.on('RPL_GLOBALUSERS', log)
    this.socket.on('RPL_STATSDLINE', log)
    this.socket.on('396', log)

    this.socket.on('PING', (msg) => {
      this.write(`PONG :${msg.trailing}`)
    })
  }

  _addMOTDHandlers() {
    const log = (msg) => {
      this.log({
        type: 'motd'
      , from: ''
      , message: msg.trailing
      , ts: new Date()
      , channel: null
      })
    }
    this.socket.on('RPL_MOTDSTART', log)
    this.socket.on('RPL_MOTD', log)
    this.socket.on('RPL_ENDOFMOTD', log)
  }

  _addWhoisHandlers() {
    // Taken from slate-irc
    // https://github.com/slate/slate-irc/blob/master/lib/plugins/whois.js
    // TODO(evanlucas) move to WeakMap
    const map = {}

    this.socket.on('RPL_WHOISUSER', (msg) => {
      const target = msg.params[1].toLowerCase()
      if (!map[target]) {
        map[target] = {
          nickname: msg.params[1]
        , username: msg.params[2]
        , hostname: msg.params[3]
        , realname: msg.trailing
        , channels: []
        , oper: false
        , server: null
        }
      } else {
        map[target].nickname = msg.params[1]
        map[target].username = msg.params[2]
        map[target].hostname = msg.params[3]
        map[target].realname = msg.trailing
        map[target].channels = []
        map[target].oper = false
      }
    })

    this.socket.on('RPL_WHOISCHANNELS', (msg) => {
      const target = msg.params[1].toLowerCase()
      const channels = msg.trailing.split(' ')
      map[target].channels = map[target].channels.concat(channels)
    })

    this.socket.on('RPL_WHOISSERVER', (msg) => {
      const target = msg.params[1].toLowerCase()
      map[target].server = msg.params[2]
    })

    this.socket.on('RPL_AWAY', (msg) => {
      const target = msg.params[1].toLowerCase()
      if (!map[target]) return
      map[target].away = msg.trailing
    })

    this.socket.on('RPL_WHOISOPERATOR', (msg) => {
      const target = msg.params[1].toLowerCase()
      map[target].oper = true
    })

    this.socket.on('RPL_WHOISIDLE', (msg) => {
      const target = msg.params[1].toLowerCase()
      map[target].idle = msg.params[2]
      map[target].sign = msg.params[3]
    })

    this.socket.on('RPL_ENDOFWHOIS', (msg) => {
      const target = msg.params[1].toLowerCase()
      if (!map[target]) return

      this.emit('whois', map[target])
    })
  }

  _addAwayHandlers() {
    const log = (msg) => {
      const type = msg.command === 'RPL_UNAWAY'
        ? 'unaway'
        : 'away'

      this.log({
        type: 'info'
      , from: ''
      , message: `${type}: ${msg.trailing}`
      , ts: new Date()
      , channel: null
      })
    }

    this.socket.on('RPL_UNAWAY', log)
    this.socket.on('RPL_NOWAWAY', log)
  }

  _addChannelHandlers() {
    this.socket.on('RPL_CHANNELMODEIS', (msg) => {
      const mode = msg.params[2]
      const channel = msg.params[1]
      const chan = this.channels.get(channel)
      if (!chan) {
        debug('RPL_CHANNELMODEIS cannot find channel %s', channel)
        return
      }
      chan.setMode(mode)
    })

    this.socket.on('RPL_WHOREPLY', (msg) => {
      debug('RPL_WHOREPLY', msg)
      const channel = msg.params[1].toLowerCase()
      const nick = msg.params[5]
      const u = msg.params[2].toLowerCase()
      const realname = msg.trailing.split(' ')
      realname.shift()
      const opts = {
        nickname: nick
      , username: u
      , address: msg.params[3]
      , realname: realname.join(' ')
      , mode: (msg.params[6] || '').replace(/H|G/, '')
      , hostmask: {
          nick: nick
        , username: u
        , hostname: msg.params[3]
        , string: msg.prefix
        }
      }

      const chan = this.channels.get(channel)
      if (!chan) {
        debug('RPL_WHOREPLY cannot find channel %s', channel)
        return
      }
      chan.addOrUpdateUser(opts)
      chan.update()
    })

    this.socket.on('RPL_TOPIC_WHO_TIME', (msg) => {
      const hostmask = msg.params[2]
      const nick = hostmask.split('!').shift() || 'Unknown'
      const date = new Date(+(msg.params[3] + '000'))

      const channel = msg.params[1].toLowerCase()
      const chan = this.channels.get(channel)
      if (!chan) {
        debug('RPL_TOPIC_WHO_TIME cannot find channel %s', channel)
        return
      }
      chan.setTopicChanged(nick, date.toGMTString())
    })

    const topicHandler = (msg) => {
      const channel = msg.command === 'TOPIC'
        ? msg.params[0].toLowerCase()
        : msg.params[1].toLowerCase()
      const topic = msg.trailing
      const hostmask = utils.hostmask(msg)
      const nick = hostmask.nick
      const chan = this.channels.get(channel)
      if (!chan) {
        debug('TOPIC cannot find channel %s', channel)
        return
      }
      if (msg.command === 'RPL_TOPIC')
        chan.setTopic(topic)
      else
        chan.setTopic(topic, nick)

      this.write(`MODE ${chan.name}`)
    }

    this.socket.on('TOPIC', topicHandler)
    this.socket.on('RPL_TOPIC', topicHandler)

    this.socket.on('JOIN', (msg) => {
      const hostmask = utils.hostmask(msg)
      const nick = hostmask.nick
      const channel = ((msg.params.length
        ? msg.params[0]
        : msg.trailing) || '').toLowerCase()

      const chan = this.channels.get(channel)
      if (!chan) {
        if (nick === this.nick) {
          const chan = this.addChannel({
            name: channel
          , topic: ''
          , nick: nick
          }, true)

          chan.joined = true
        }
        return
      }

      if (nick !== this.nick) {
        chan.addUser({
          nickname: nick
        , username: hostmask.username
        , address: hostmask.hostname
        , realname: ''
        , mode: ''
        , color: null
        })

        debug('%s joined %s', nick, channel)
      } else {
        chan.joined = true
        chan.update()
      }
    })

    this.socket.on('RPL_NAMREPLY', (msg) => {
      debug('RPL_NAMREPLY', msg)
      const channel = msg.params[msg.params.length - 1].toLowerCase()
      const chan = this.channels.get(channel)
      if (!chan) {
        debug('RPL_NAMREPLY cannot find channel %s', channel)
        return
      }

      this.write(`WHO ${channel}`)
      const names = msg.trailing.split(' ')
      for (var i = 0; i < names.length; i++) {
        const u = names[i].split(/([~&@%+])/)
        const item = {
          nickname: u.pop()
        , mode: u.pop() || ''
        }
        chan._addUser(item)
      }
      chan.setNames()
    })

    this.socket.on('MODE', (msg) => {
      const hostmask = utils.hostmask(msg)
      const nick = hostmask.nick
      const target = msg.params[0].toLowerCase()
      const mode = msg.params[1] || msg.trailing
      const client = msg.params[2]
      const chan = this.channels.get(target)
      if (!chan) {
        debug('MODE could not find channel %s', target)
        return
      }

      const cl = client ? ` ${client}` : ''
      chan.addMessage({
        message: `${nick} sets mode ${mode}${cl}`
      , type: 'info'
      , to: null
      , from: null
      , hostmask: hostmask
      , mention: client === this.nick
      })

      this.write(`NAMES ${chan.name} ${client}`)

      chan.setNames()
    })

    this.socket.on('INVITE', (msg) => {
      const hostmask = utils.hostmask(msg)
      const from = hostmask.nick
      const to = msg.params[0].toLowerCase()
      const channel = msg.trailing

      this.emit('invite', {
        hostmask: hostmask
      , from: from
      , to: to
      , channel: channel
      })
    })

    this.socket.on('PRIVMSG', (msg) => {
      const hostmask = utils.hostmask(msg)
      debug('hostmask', hostmask)
      const from = hostmask.nick
      const to = msg.params[0]
      let message = msg.trailing

      const channel = to.toLowerCase()

      let chan
      if (this.channels.has(channel)) {
        chan = this.channels.get(channel)
      } else if (channel === this.nick) {
        chan = this.addQuery({
          name: from
        , topic: `Conversation with ${from}`
        , nick: this.nick
        , unread: 0
        , messages: []
        })
      }

      if (!chan) return

      let type = 'message'

      const sub = message.substring(0, 7)
      if (sub === '\u0001ACTION') {
        type = 'action'
        message = message.substring(7).replace('\u0001', '')
      }

      chan.unread++

      chan.addMessage({
        message: message
      , type: type
      , to: to
      , from: from
      , hostmask: hostmask
      , mention: !!~message.toLowerCase().indexOf(this.nick)
      })
    })

    this.socket.on('NICK', (msg) => {
      debug('NICK %s', this.nick, msg)
      const hostmask = utils.hostmask(msg)
      const nick = hostmask.nick
      const newNick = msg.trailing || msg.params[0]
      if (nick === this.nick) {
        this.updateMyNick(newNick)
        this.log({
          type: 'info'
        , message: `You are now known as ${newNick}`
        , ts: new Date()
        , channel: null
        })

        // TODO(evanlucas) Add the log to each channel
      }

      this.handleNickChanged({
        from: nick
      , to: newNick
      , hostmask: hostmask
      })
    })
  }

  log(opts) {
    if (!opts.type) {
      throw new Error('message type is required')
    }

    const msg = new Message({
      type: opts.type
    , from: opts.from
    , message: opts.message
    , ts: opts.ts || new Date()
    , channel: opts.channel
    })

    this.logs.push(msg)
    this.emit('log', msg)
  }

  send(target, data) {
    this.write(`PRIVMSG ${utils.getTarget(target)} :${data}`)
  }

  _updatePanels() {
    this._panels.clear()

    for (const chan of this.channels) {
      this._panels.set(chan[0], chan[1])
    }

    for (const chan of this.queries) {
      this._panels.set(chan[0], chan[1])
    }
  }

  // Channel stuff

  addChannel(opts) {
    const name = opts.name.toLowerCase()
    if (this.channels.has(name)) {
      return this.channels.get(name)
    }

    const chan = new Channel({
      name: opts.name
    , topic: opts.topic
    , nick: opts.nick || this.user.nickname
    , messages: opts.messages || []
    , unread: opts.unread || 0
    , connection: this
    , type: 'channel'
    })

    this.channels.set(name, chan)
    this._updatePanels()

    this.emit('channelAdded', chan)
    return chan
  }

  removeChannel(name) {
    const n = name.toLowerCase()
    if (!this.channels.has(n)) {
      return
    }

    const chan = this.channels.get(n)

    this.channels.delete(n)
    this._updatePanels()

    this.emit('channelRemoved', chan)
  }

  addQuery(opts) {
    debug('addQuery', opts.name)
    const name = opts.name.toLowerCase()
    if (this.queries.has(name)) {
      return this.queries.get(name)
    }

    const chan = new Channel({
      name: opts.name
    , topic: opts.topic
    , nick: opts.nick || this.nick
    , messages: opts.messages || []
    , unread: opts.unread || 0
    , connection: this
    , from: opts.name
    , type: 'private'
    })

    this.queries.set(name, chan)
    this._updatePanels()

    this.emit('queryAdded', chan)
    return chan
  }

  removeQuery(name) {
    const n = name.toLowerCase()
    if (!this.queries.has(n)) {
      return
    }

    const chan = this.queries.get(n)

    this.queries.delete(n)
    this._updatePanels()

    this.emit('queryRemoved', chan)
  }

  updateMyNick(nick) {
    debug('update my nick %s', nick)

    this.nick = nick

    for (const chan of this.channels.values()) {
      chan.updateMyNick(nick)
    }

    for (const chan of this.queries.values()) {
      chan.updateMyNick(nick)
    }
  }

  handleNickChanged(opts) {
    debug('nick changed', opts)
    const from = opts.from.toLowerCase()
    const to = opts.to
    const toLower = to.toLowerCase()

    for (const chan of this.channels.values()) {
      if (chan.users.has(from)) {
        const user = chan.users.get(from)
        user.nickname = to
        chan.users.delete(from)
        chan.users.set(toLower, user)
        chan.setNames()
      }
    }

    if (this.queries.has(from)) {
      const chan = this.queries.get(from)
      chan.from = to
      if (chan.users.has(from)) {
        const user = chan.users.get(from)
        user.nickname = to
        chan.users.delete(from)
        chan.users.set(toLower, user)
        chan.setNames()
      }

      this.queries.delete(from)
      this.queries.set(toLower, chan)
    }
  }

  // Helpers

  write(str) {
    this.socket.write(str)
  }

  toJSON() {
    const out = {
      name: this.name
    , server: this.server
    , user: {
        username: this.user.username
      , realname: this.user.realname
      , nickname: this.user.nickname
      , altNick: this.user.altNick
      }
    , channels: []
    , queries: []
    , settings: this.settings.toJSON()
    }

    for (const chan of this.channels.values()) {
      out.channels.push(chan.toJSON())
    }

    for (const chan of this.queries.values()) {
      out.queries.push(chan.toJSON())
    }

    return out
  }
}
