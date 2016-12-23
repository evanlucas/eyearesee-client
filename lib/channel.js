'use strict'

const EE = require('events')
const Message = require('./message')
const User = require('./user')
const debug = require('debug')('eyearesee:channel')
const colors = require('./colors')
const mapUtil = require('map-util')

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
    this.topicChangedAt = opts.topicChangedAt || ''

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
    if (this.conn.connected) {
      this.conn.write(`WHOIS ${this.from}`)
    } else {
      this.conn.once('connect', () => {
        this.conn.write(`WHOIS ${this.from}`)
      })
    }
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
    this.renameUser(this.nick, nick)

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

    let mention = opts.mention || false
    if (!mention && this.type === 'private') {
      if (this.to === this.nick) {
        mention = true
      }
    }

    const msg = new Message({
      message: opts.message
    , type: opts.type
    , to: opts.to
    , from: opts.from
    , hostmask: opts.hostmask
    , channel: this
    , ts: opts.ts || new Date()
    , mention: opts.mention
    })

    this.messages.push(msg)

    if (msg.mention) {
      this.emit('mention', msg)
    }

    this.emit('log', msg)
    this.conn.emit('channelLog', this, msg)
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

  renameUser(oldNick, newNick) {
    oldNick = oldNick.toLowerCase()
    const nlower = newNick.toLowerCase()

    debug('update my nick from %s -> %s', oldNick, newNick)

    if (this.users.has(oldNick)) {
      const u = this.users.get(oldNick)
      mapUtil.replace(oldNick, nlower, this.users)
      mapUtil.replace(oldNick, nlower, this.colorMap)
      u.nickname = newNick
      this.setNames()
    }
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
    if (this.joined && this.type === 'channel') {
      const m = this.conn.settings.get('part.message')
      this.conn.write(`PART ${this.name} :${m}`)
    }

    if (this.type === 'channel') {
      this.conn.removeChannel(this.name)
    } else {
      this.conn.removeQuery(this.name)
    }
  }

  userJoined(nick, hostmask) {
    this.addUser({
      nickname: nick
    , username: hostmask.username
    , address: hostmask.hostname
    , realname: ''
    , mode: ''
    , color: null
    })

    if (this.conn.settings.get('log.events')) {
      const addr = `(${hostmask.username}@${hostmask.hostname})`
      this.addMessage({
        message: `⇾ ${nick} ${addr} joined the channel`
      , type: 'join'
      , to: null
      , from: null
      , hostmask: hostmask
      , mention: false
      })
    }

    this.update()
  }

  removeUser(nick, message) {
    const lower = nick.toLowerCase()
    if (!this.users.has(lower)) {
      return
    }

    if (this.conn.settings.get('log.events')) {
      const user = this.users.get(lower)
      const addr = `(${user.username}@${user.address})`
      const m = message ? ` (${message})` : ''
      this.addMessage({
        message: `⇽ ${user.nickname} ${addr} left the channel${m}`
      , type: 'part'
      , to: null
      , from: null
      , hostmask: {
          nick: user.nickname
        , username: user.username
        , hostname: user.address
        , string: `${user.nickname}!${user.username}@${user.address}`
        }
      , mention: false
      })
    }

    this.colorMap.delete(lower)
    this.users.delete(lower)
    this.setNames()
    this.update()
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
    , messages: this.messages
    }
  }
}
