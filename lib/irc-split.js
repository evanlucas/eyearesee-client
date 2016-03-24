'use strict'

const Transform = require('stream').Transform
const inherits = require('util').inherits

const DELIMITER = Buffer('\r\n')
module.exports = Split

function Split() {
  if (!(this instanceof Split))
    return new Split()

  Transform.call(this)
  this._current = null
}
inherits(Split, Transform)

Split.prototype._transform = function _transform(chunk, enc, cb) {
  if (this._current) {
    chunk = Buffer.concat([this._current, chunk])
  }

  let idx = chunk.indexOf(DELIMITER)
  if (idx === -1) {
    this._current = chunk
    return cb()
  }

  let off = 0
  while (idx !== -1) {
    const slice = chunk.slice(0, idx)
    off += slice.length + 2
    this.push(slice)
    chunk = chunk.slice(idx + 2)
    idx = chunk.indexOf(DELIMITER)
  }

  this._current = chunk
  return cb()
}
