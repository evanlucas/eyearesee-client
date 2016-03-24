'use strict'

module.exports = class User {
  constructor(opts) {
    this.nickname = opts.nickname
    this.username = opts.username
    this.address = opts.address
    this.realname = opts.realname
    this.mode = opts.mode
    this.color = opts.color
  }
}
