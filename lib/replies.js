'use strict'

const Replies = require('irc-replies')
const replies = exports

const keys = Object.keys(Replies)
const len = keys.length
for (var i = 0; i < len; i++) {
  replies[keys[i]] = Replies[keys[i]]
}

// additions

// https://github.com/ircv3/ircv3-specifications/blob/master/extensions/sasl-3.1.md
// sasl
replies['900'] = 'RPL_LOGGEDIN'
replies['901'] = 'RPL_LOGGEDOUT'
replies['902'] = 'ERR_NICKLOCKED'
replies['903'] = 'RPL_SASLSUCCESS'
replies['904'] = 'RPL_SASLFAIL'
replies['905'] = 'RPL_SASLTOOLONG'
replies['906'] = 'RPL_SASLABORTED'
replies['907'] = 'RPL_SASLALREADY'
replies['908'] = 'RPL_SASLMECHS'
