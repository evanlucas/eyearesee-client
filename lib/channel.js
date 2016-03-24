'use strict'

const EE = require('events')
const Message = require('./message')
const User = require('./user')
const debug = require('debug')('eyearesee:channel')
const colors = require('./colors')

module.exports = class Channel extends EE {
  constructor(opts) {
    super()

    const conn = opts.connection
    this.name = opts.name
    this.topic = opts.topic || ''
    this.messages = opts.messages || []
    this.type = opts.type || 'channel'
    this.mode = opts.mode || ''
    this.conn = conn
    this.nick = opts.nick || ''
    this.joined = opts.joined || false
    this.unread = opts.unread || 0
    this.from = opts.from || ''

    // TODO(evanlucas) change to irc-channel
    this.ele = '.channel-container'

    this.topicChangedBy = opts.topicChangedBy || ''
    this.ltopicChangedAt = opts.topicChangedAt || ''

    this.url = `${conn.url}/channels/${this.name}`

    this.users = new Map()
    this.colorMap = new Map()
    this.names = []
    this._onlyNames = []

    if (this.from && this.type === 'private')
      this._addInitialUsers()
  }

  getConnection() {
    return this.conn
  }

  _addInitialUsers() {
    this._addOrUpdateUser({ nickname: this.conn.nick })

    if (this.from)
      this._addOrUpdateUser({ nickname: this.from })

    this.setNames()
    this.conn.write(`WHOIS ${this.from}`)
  }

  // Topic/mode related stuff
  setTopic(topic, who) {
    if (topic !== this.topic) {
      this.topic = topic
      const msg = who
        ? `${who} changed the topic to ${topic}`
        : `Topic: ${topic}`

      this.addMessage({
        message: msg
      , type: 'info'
      })

      this.conn.log({
        type: 'topic'
      , from: ''
      , message: `${this.name}: ${msg}`
      , ts: new Date()
      , hostmask: null
      , channel: this.name
      })
    }
  }

  setTopicChanged(by, at) {
    if (by !== this.topicChangedBy && at !== this.topicChangedAt) {
      debug('topic changed %s %s', by, at)
      this.topicChangedBy = by
      this.topicChangedAt = at
      this.addMessage({
        message: `Set by ${by} on ${at}`
      , type: 'info'
      })
    }
  }

  setMode(mode) {
    if (mode !== this.mode) {
      debug('mode changed %s', mode)
      this.mode = mode
      this.addMessage({
        message: `Mode is ${mode}`
      , type: 'info'
      })
    }
  }

  // Stuff related to the current user
  updateMyNick(nick) {
    this.nick = nick

    this.addMessage({
      message: `You are now known as ${nick}`
    , type: 'info'
    , to: null
    , from: null
    , hostmask: null
    , ts: new Date()
    , mention: false
    })
  }

  // Message stuff

  addMessage(opts) {
    const limit = this.conn.settings.get('messages.limit')
    if (this.messages.length > limit) {
      this.messages.shift()
    }

    const msg = new Message({
      message: opts.message
    , type: opts.type
    , to: opts.to
    , from: opts.from
    , hostmask: opts.hostmask
    , channel: this
    , ts: opts.ts || new Date()
    , mention: opts.mention || false
    })

    this.messages.push(msg)

    if (msg.mention) {
      this.emit('mention', msg)
    }

    this.emit('log', msg)
    this.update()

    return msg
  }

  send(msg) {
    this.addMessage({
      message: msg
    , type: 'message'
    , to: this.name
    , from: this.nick
    , hostmask: null
    , ts: new Date()
    , mention: false
    })

    this.conn.send(this.name, msg)
  }

  action(msg) {
    this.addMessage({
      message: msg
    , type: 'action'
    , to: this.name
    , from: this.nick
    , hostmask: null
    , ts: new Date()
    , mention: false
    })

    this.conn.send(this.name, `\u0001ACTION ${msg}\u0001`)
  }

  // User stuff
  addUser(opts) {
    const out = this._addUser(opts)
    this.setNames()
    return out
  }

  _addUser(opts) {
    debug('add user', opts)
    const nick = (opts.nickname || '').toLowerCase()
    if (this.users.has(nick)) {
      return this.users.get(nick)
    }

    const user = new User({
      nickname: opts.nickname
    , username: opts.username
    , address: opts.address
    , realname: opts.realname
    , mode: opts.mode
    , color: opts.color || colors.nextColor()
    })

    this.colorMap.set(nick, user.color)
    this.users.set(nick, user)

    return user
  }

  addOrUpdateUser(opts) {
    const out = this._addOrUpdateUser(opts)
    this.setNames()
    return out
  }

  _addOrUpdateUser(opts) {
    debug('_addOrUpdateUser', opts)
    const nick = (opts.nickname || '').toLowerCase()
    if (!this.users.has(nick)) {
      return this._addUser(opts)
    }

    const user = this.users.get(nick)
    user.username = opts.username
    user.address = opts.address
    user.realname = opts.realname
    user.mode = opts.mode

    return user
  }

  partAndDestroy() {
    if (this.joined) {
      this.part()
    }

    this.conn.removeChannel(this.name)
  }

  setNames() {
    const names = new Array(this.users.size)
    this._onlyNames = new Array(names.length)
    var i = 0
    for (const item of this.users.values()) {
      names[i] = {
        name: item.nickname
      , mode: item.mode
      }
      this._onlyNames[i++] = item.nickname
    }

    this.names = names.sort((a, b) => {
      if (a.mode === b.mode) {
        return a.name < b.name
          ? -1
          : a.name > b.name
          ? 1
          : 0
      }

      if (a.mode > b.mode) {
        return -1
      } else if (a.mode < b.mode) {
        return 1
      }

      return 0
    })
  }

  update() {
    if (this.conn) {
      this.conn.emit('channelUpdated', this)
    }
  }

  toJSON() {
    return {
      name: this.name
    , type: this.type
    , topic: this.topic
    }
  }
}
