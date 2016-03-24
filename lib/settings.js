'use strict'

const EE = require('events')

module.exports = class Settings extends EE {
  constructor(defs, conn) {
    super()
    this._map = new Map()
    this._defaults = defs || new Map()
    this._conn = conn
  }

  getConnection() {
    return this._conn
  }

  get(key) {
    if (this._map.has(key)) {
      return this._map.get(key)
    }

    return this._defaults.get(key)
  }

  set(key, val) {
    const orig = this._map.get(key)
    const out = this._map.set(key, val)
    this.emit('settingChanged', key, orig, val)
    return out
  }

  toJSON() {
    const out = {}
    for (const item of this._map) {
      out[item[0]] = item[1]
    }

    return out
  }

  // does not clear the settings
  load(opts) {
    const keys = Object.keys(opts)
    for (var i = 0; i < keys.length; i++) {
      this._map.set(keys[i], opts[keys[i]])
    }
  }
}
