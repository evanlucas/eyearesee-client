# Message

```js
const Message = require('eyearesee-client').Message
```

### API

#### Message(opts)

* `opts` [`<Object>`][] Set of configurable options.
  Can have the following fields:
  * `message` [`<String>`][] The actual message
  * `to` [`<String>`][] The recipient of the message
  * `from` [`<String>`][] The sender of the message
  * `hostmask` [`<String>`][] The message hostmask
  * `mention` [`<Boolean>`][] Is this a mention?
  * `type` [`<String>`][] The message type
  * `channel` [`<Channel>`][] The channel to which this message belongs
  * `ts` [`<Date>`][] The message timestamp
  * `formatted` [`<String>`][] The formatted message
  * `messageFormatter` [`<Function>`][]

The `messageFormatter` option is useful for formatting a message for
use in a particular way. For example, maybe we want to render it as html,
but only want to compute that html once. This option is quite useful for that
case.

##### getConnection()

Returns the [`<Connection>`][] to which this message is associated.

[`<Boolean>`]: https://mdn.io/boolean
[`<Date>`]: https://mdn.io/date
[`<Function>`]: https://mdn.io/function
[`<Object>`]: https://mdn.io/object
[`<String>`]: https://mdn.io/string
[`<Channel>`]: channel.md
[`<Connection>`]: connection.md
