'use strict'

exports.getTarget = function getTarget(target) {
  if (Array.isArray(target))
    return target.join(',')

  return target
}

exports.hostmask = function hostmask(msg) {
  const parts = msg.prefix.split('!')
  const nick = parts[0]
  const p1 = parts[1] || ''

  const splits = p1.split('@')
  const username = splits[0]
  const hostname = splits[1]

  return {
    nick: nick
  , username: username
  , hostname: hostname
  , string: msg.prefix
  }
}
