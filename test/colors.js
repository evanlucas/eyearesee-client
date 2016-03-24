'use strict'

const test = require('tap').test
const colors = require('../lib/colors')

test('colors', (t) => {
  t.type(colors.colors, Array)
  t.equal(colors.nextColor(), 'green', 'nextColor()')
  t.equal(colors.nextColor(), 'red', 'nextColor()')
  t.end()
})
