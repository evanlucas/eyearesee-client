'use strict'

const net = require('net')
const tls = require('tls')
const EE = require('events')
const inherits = require('util').inherits
const Parser = require('./parser')
const Split = require('./irc-split')
const replies = require('./replies')
const debug = require('debug')('eyearesee:socket')
const debugData = require('debug')('eyearesee:socket-data')
const LF = '\r\n'

module.exports = Socket

function Socket(opts) {
  EE.call(this)

  this.opts = Object.assign({
    secure: false
  , timeout: 5 * 60 * 1000
  , host: '127.0.0.1'
  , pingTimeout: 15 * 1000
  }, opts)

  if (!this.opts.port) {
    if (this.opts.secure) {
      this.opts.port = 6697
    } else {
      this.opts.port = 6667
    }
  }

  this.hostname = null
  this.connected = false

  this._waitingForPong = false
}
inherits(Socket, EE)

Socket.prototype.connect = function connect() {
  debug('connecting')
  const opts = this.opts

  this.socket = opts.secure
    ? this._createTlsSocket()
    : this._createNetSocket()

  this.socket.setTimeout(this.opts.timeout)
  this.socket.on('timeout', () => {
    if (this._waitingForPong) {
      debug('already waiting for PONG...')
      return
    }
    this._waitingForPong = true

    debug('socket timed out...sending PING')
    const time = Date.now()
    this.socket.write(`PING ${this.hostname || ':' + time}`)

    let timeout = setTimeout(() => {
      debug('PING request timed out...destroy')
      this.emit('timeout')
      this._waitingForPong = false
      this.removeListener('PONG', pongHandler)
      this.socket.destroy()
    }, this.opts.pingTimeout)

    const pongHandler = (msg) => {
      debug('GOT PONG', msg)
      if (+msg === time) {
        clearTimeout(timeout)
        timeout = null
        this._waitingForPong = false
      }
    }

    this.once('PONG', pongHandler)
  })

  this.once('RPL_MOTDSTART', (msg) => {
    this.hostname = msg.prefix
    this.emit('hostname', this.hostname)
  })

  this.socket.once('connect', () => {
    debug('connected')
    this.connected = true

    // TODO(evanlucas) Add CAP support

    if (opts.password) {
      this.write(`PASS ${opts.password}`)
    }

    this.write(`NICK ${opts.nickname}`)
    this.write(`USER ${opts.username} 0 * :${opts.realname}`)

    this.emit('connect')
  })

  this.socket.on('close', () => {
    debug('close')
    this.connected = false
    this.emit('close')
  })

  this.socket.on('error', (err) => {
    this.emit('error', err)
  })

  this.on('ERR_NICKNAMEINUSE', (msg) => {
    var oldNick = String(msg.params[1])
    if (oldNick === opts.nickname && opts.altNick) {
      if (opts.altNick !== opts.nickname) {
        debug('use nick %s', opts.altNick)
        this.write(`NICK ${opts.altNick}`)
      }
    } else {
      var newNick = oldNick
      const oldCharCode = (newNick[newNick.length - 1]).charCodeAt(0)
      const newChar = String.fromCharCode(oldCharCode + 1)
      newNick = newNick.slice(0, newNick.length - 1) + newChar
      debug('use nick %s', newNick)
      this.write(`NICK ${newNick}`)
    }
  })

  this.socket
    .pipe(Split())
    .pipe(Parser())
    .on('data', (chunk) => {
      this._handleData(chunk)
    })
}

Socket.prototype._handleData = function _handleData(msg) {
  msg.command = replies[msg.command] || msg.command
  if (msg.command) {
    debugData('%s %j', msg.command, msg)
    this.emit(msg.command, msg)
  }

  if (~msg.command.indexOf('ERR_')) {
    this.emit('IRC_ERROR', {
      command: msg.command
    , message: msg.trailing || ''
    })
  }

  this.emit('data', msg)
}

Socket.prototype._createNetSocket = function _createNetSocket() {
  return net.connect({
    port: this.opts.port
  , host: this.opts.host
  })
}

Socket.prototype._createTlsSocket = function _createTlsSocket() {
  return tls.connect({
    port: this.opts.port
  , host: this.opts.host
  })
}

Socket.prototype.write = function write(str, cb) {
  debug('write %s', str)
  return this.socket.write(`${str}${LF}`, cb)
}

Socket.prototype.close = function close(cb) {
  if (cb) {
    this.socket.once('close', cb)
  }

  this.socket.end()
}
