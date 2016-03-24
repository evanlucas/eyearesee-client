'use strict'

const test = require('tap').test
const Split = require('../lib/irc-split')
const Parser = require('../lib/parser')
const Readable = require('stream').Readable

const m1 = ':hitchcock.freenode.net NOTICE * :*** Looking up your ' +
  'hostname...\r\n'

const m2 = 'ERROR :Closing Link: 127.0.0.1 (Connection timed out)\r\n'

const m3 = ':tjholowaychuk!~tjholoway@S01067cb21b2fd643.gv.shawcable.net ' +
  'JOIN #express\r\n'

const tests = [
  { name: 'server notice'
  , raw: m1
  , msg: { prefix: 'hitchcock.freenode.net'
         , command: 'NOTICE'
         , params: ['*']
         , trailing: '*** Looking up your hostname...'
         , string: m1.trim()
         , tags: {}
         }
  }
, { name: 'connection timed out'
  , raw: m2
  , msg: { prefix: ''
         , command: 'ERROR'
         , params: []
         , trailing: 'Closing Link: 127.0.0.1 (Connection timed out)'
         , string: m2.trim()
         , tags: {}
         }
  }
, { name: 'join channel'
  , raw: m3
  , msg: { prefix: 'tjholowaychuk!~tjholoway@S01067cb21b2fd643.gv.shawcable.net'
         , command: 'JOIN'
         , params: ['#express']
         , trailing: ''
         , string: m3.trim()
         , tags: {}
         }
  }
, { name: 'FOO'
  , raw: 'FOO\r\n'
  , msg: { prefix: ''
         , command: 'FOO'
         , params: []
         , trailing: ''
         , string: 'FOO'
         , tags: {}
         }
  }
, { name: ':test FOO'
  , raw: ':test FOO\r\n'
  , msg: { prefix: 'test'
         , command: 'FOO'
         , params: []
         , trailing: ''
         , string: ':test FOO'
         , tags: {}
         }
  }
, { name: ':test FOO     '
  , raw: ':test FOO     \r\n'
  , msg: { prefix: 'test'
         , command: 'FOO'
         , params: []
         , trailing: ''
         , string: ':test FOO     '
         , tags: {}
         }
  }
, { name: ':test!me@test.ing PRIVMSG #Test :This is a test'
  , raw: ':test!me@test.ing PRIVMSG #Test :This is a test\r\n'
  , msg: { prefix: 'test!me@test.ing'
         , command: 'PRIVMSG'
         , params: ['#Test']
         , trailing: 'This is a test'
         , string: ':test!me@test.ing PRIVMSG #Test :This is a test'
         , tags: {}
         }
  }
, { name: 'PRIVMSG #Test :This is a test'
  , raw: 'PRIVMSG #Test :This is a test\r\n'
  , msg: { prefix: ''
         , command: 'PRIVMSG'
         , params: ['#Test']
         , trailing: 'This is a test'
         , string: 'PRIVMSG #Test :This is a test'
         , tags: {}
         }
  }
, { name: ':test PRIVMSG foo :A string    with spaces   '
  , raw: ':test PRIVMSG foo :A string    with spaces   \r\n'
  , msg: { prefix: 'test'
         , command: 'PRIVMSG'
         , params: ['foo']
         , trailing: 'A string    with spaces   '
         , string: ':test PRIVMSG foo :A string    with spaces   '
         , tags: {}
         }
  }
, { name: ':test     PRIVMSG    foo     :bar'
  , raw: ':test     PRIVMSG    foo     :bar\r\n'
  , msg: { prefix: 'test'
         , command: 'PRIVMSG'
         , params: ['foo']
         , trailing: 'bar'
         , string: ':test     PRIVMSG    foo     :bar'
         , tags: {}
         }
  }
, { name: ':test FOO bar baz quux'
  , raw: ':test FOO bar baz quux\r\n'
  , msg: { prefix: 'test'
         , command: 'FOO'
         , params: ['bar', 'baz', 'quux']
         , trailing: ''
         , string: ':test FOO bar baz quux'
         , tags: {}
         }
  }
, { name: 'FOO bar baz quux'
  , raw: 'FOO bar baz quux\r\n'
  , msg: { prefix: ''
         , command: 'FOO'
         , params: ['bar', 'baz', 'quux']
         , trailing: ''
         , string: 'FOO bar baz quux'
         , tags: {}
         }
  }
, { name: 'FOO    bar    baz    quux'
  , raw: 'FOO    bar    baz    quux\r\n'
  , msg: { prefix: ''
         , command: 'FOO'
         , params: ['bar', 'baz', 'quux']
         , trailing: ''
         , string: 'FOO    bar    baz    quux'
         , tags: {}
         }
  }
, { name: 'FOO bar baz quux :This is a test'
  , raw: 'FOO bar baz quux :This is a test\r\n'
  , msg: { prefix: ''
         , command: 'FOO'
         , params: ['bar', 'baz', 'quux']
         , trailing: 'This is a test'
         , string: 'FOO bar baz quux :This is a test'
         , tags: {}
         }
  }
, { name: ':test PRIVMSG #fo:oo :This is a test'
  , raw: ':test PRIVMSG #fo:oo :This is a test\r\n'
  , msg: { prefix: 'test'
         , command: 'PRIVMSG'
         , params: ['#fo:oo']
         , trailing: 'This is a test'
         , string: ':test PRIVMSG #fo:oo :This is a test'
         , tags: {}
         }
  }
, { name: 'tags test'
  , raw: '@test=super;single :test!me@test.ing FOO bar baz quux :This is a ' +
      'test\r\n'
  , msg: { prefix: 'test!me@test.ing'
         , command: 'FOO'
         , params: ['bar', 'baz', 'quux']
         , trailing: 'This is a test'
         , string: '@test=super;single :test!me@test.ing FOO bar baz quux' +
            ' :This is a test'
         , tags: {
             test: 'super'
           , single: true
           }
         }
  }
]

tests.forEach((item) => {
  test(`Parser - ${item.name}`, (t) => {
    t.plan(2)
    function read() {
      this.push(item.raw)
      this.push(null)
    }

    const stream = new Readable({
      read: read
    })

    if (item.name === 'tags test') debugger

    stream
      .pipe(Split())
      .pipe(Parser())
      .on('data', (msg) => {
        t.deepEqual(msg, item.msg)
      })
      .on('end', () => {
        t.pass('got end event')
      })
  })
})
