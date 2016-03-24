'use strict'

module.exports = class Message {
  constructor(opts) {
    this.message = opts.message
    this.to = opts.to || ''
    this.from = opts.from || ''
    this.hostmask = opts.hostmask
    this.mention = opts.mention || false
    this.type = opts.type || 'message'
    this.channel = opts.channel
    this.ts = opts.ts || new Date()
    this.formatted = opts.formatted || opts.message
    const conn = opts.connection || this.getConnection()
    this.connection = conn

    if (conn && typeof conn.messageFormatter === 'function') {
      this.formatted = conn.messageFormatter(this)
    }
  }

  getConnection() {
    if (this.connection) {
      return this.connection
    }

    if (this.channel && this.channel.getConnection) {
      return this.channel.getConnection()
    }

    return null
  }
}
