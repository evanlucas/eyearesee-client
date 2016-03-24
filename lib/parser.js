'use strict'

const Transform = require('stream').Transform
const inherits = require('util').inherits

const TAG_START = Buffer('@')[0]
const PREFIX = Buffer(':')[0]
const SPACE = Buffer(' ')[0]
const SEMICOLON = Buffer(';')[0]
const SPACE_PREFIX = Buffer(' :')

module.exports = Parser

function Parser() {
  if (!(this instanceof Parser))
    return new Parser()

  Transform.call(this, {
    readableObjectMode: true
  })
}
inherits(Parser, Transform)

Parser.prototype._transform = function _transform(chunk, enc, cb) {
  const out = {
    prefix: ''
  , command: ''
  , params: []
  , trailing: ''
  , string: chunk.toString('utf8', 0, chunk.length)
  , tags: {}
  }

  let off = 0
  let next

  if (chunk[0] === TAG_START) {
    next = chunk.indexOf(SPACE, 0)
    // invalid message, just silently drop it
    if (next === -1) {
      return cb()
    }

    const raw = chunk.slice(1, next).toString().split(';')
    for (var i = 0; i < raw.length; i++) {
      const splits = raw[i].split('=')
      out.tags[splits[0]] = splits[1] || true
    }

    off = next + 1
  }

  while (chunk[off] === SPACE) {
    off++
  }

  // prefix
  if (chunk[off] === PREFIX) {
    next = chunk.indexOf(SPACE, off)
    if (next === -1) {
      return cb()
    }
    let prefix = chunk.slice(off + 1, next)
    off = next + 1
    out.prefix = prefix.toString()
    while (chunk[off] === SPACE) {
      off++
    }
  }

  next = chunk.indexOf(SPACE, off)

  if (next === -1) {
    if (chunk.length > off) {
      out.command = chunk.slice(off).toString()
      this.push(out)
    }

    return cb()
  }

  out.command = chunk.slice(off, next).toString()
  off = next + 1

  // params
  i = chunk.indexOf(SPACE_PREFIX, off)
  if (i === -1) {
    i = chunk.length
  }
  while (chunk[off] === SPACE) {
    off++
  }
  const end = i === chunk.length ? i : i - 1
  const paramsBuf = chunk.slice(off, i)
  off += paramsBuf.length

  if (paramsBuf[0] === PREFIX) {
    out.trailing = paramsBuf.slice(1).toString()
    this.push(out)
    return cb()
  }

  const paramsStr = paramsBuf.toString()
  if (paramsStr) {
    out.params = paramsStr.split(' ').filter((item) => {
      return !!item
    })
  }

  while (chunk[off] === SPACE) {
    off++
  }

  if (chunk[off] === PREFIX) off++
  out.trailing = chunk.slice(off, chunk.length).toString()

  this.push(out)
  cb()
}
