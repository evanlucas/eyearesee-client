'use strict'

const keytar = require('keytar')
const SERVICE = 'eyearesee (irc client) '

exports.saveCreds = function saveCreds(name, user, password) {
  const service = `${SERVICE}- ${name}`
  const pass = keytar.getPassword(service, user)
  if (pass) {
    keytar.replacePassword(service, user, password)
  } else {
    keytar.addPassword(service, user, password)
  }
}

exports.getCreds = function getCreds(name, user) {
  const service = `${SERVICE}- ${name}`
  return keytar.getPassword(service, user)
}
