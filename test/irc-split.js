'use strict'

const test = require('tap').test
const Split = require('../lib/irc-split')
const Readable = require('stream').Readable

const lastVal = '11aaaaaaaaaaa12aaaaaaaaaaaa13aaaaaaaaaaaaa14aaaaaaaaaaaaaa'

test('Split', (t) => {
  let count = 0
  let buf
  function read() {
    count++

    if (count % 5 === 0) {
      this.push('\r\n')
    } else {
      this.push(count + 'a'.repeat(count))
    }

    if (count === 15) {
      this.push(null)
    }
  }

  const stream = new Readable({
    read: read
  })

  let dcount = 0
  stream
    .pipe(Split())
    .on('data', (chunk) => {
      dcount++
      switch (dcount) {
        case 1:
          t.equal(chunk.length, 14, 'length')
          t.equal(chunk.toString(), '1a2aa3aaa4aaaa')
          break
        case 2:
          t.equal(chunk.length, 34, 'length')
          t.equal(chunk.toString(), '6aaaaaa7aaaaaaa8aaaaaaaa9aaaaaaaaa')
          break
        case 3:
          t.equal(chunk.length, 58, 'length')
          t.equal(chunk.toString(), lastVal)
          break
        default:
          t.fail('unreachable')
          break
      }
    })
    .on('end', () => {
      t.end()
    })
})
