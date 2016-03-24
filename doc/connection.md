# Connection

```js
const Connection = require('eyearesee-client').Connection
```

### API

#### Connection(opts)

* `opts` [`<Object>`][] Set of configurable options.
  Can have the following fields:
  * `name` [`<String>`][] **(Required)** The connection name.
  * `user` [`<Object>`][] **(Required)** The user for the connection.
    Can have the following fields:
    * `nickname` [`<String>`][] **(Required)** The user's nickname
    * `username` [`<String>`][] The user's username
    * `realname` [`<String>`][] The user's real name
    * `altNick` [`<String>`][] The alt nick to try if the `nickname` is taken
    * `password` [`<String>`][] The user's password
  * `server` [`<Object>`][] **(Required)** The server to which we will connect.
    Can have the following fields:
    * `host` [`<String>`][] **(Required)** The server's url or ip
    * `port` [`<Number>`][] The port on which to connect
    * `secure` [`<Boolean>`][] Whether to use TLS or not
  * `settings` [`<Object>`][] The settings to preload into this connection.
  * `messageFormatter` [`<Function>`][] Default message formatter
  * `channels` [`<Array>`][] Array of channels to initially add
  * `queries` [`<Array>`][] Array of queries to initially add

Creates a new connection.

If `server.port` is not provided, it will be set automatically based on the
`server.secure` property. If `server.secure` is `true`, `server.port` will
be set to `6697`. If `false`, `server.port` will be set to `6667`.

The `settings` object allows passing settings to preload. The default settings
include:

* `connect.auto` [`<Boolean>`][] Whether to connect automatically
  * Default: `false`
* `log.events` [`<Boolean>`][] Whether to log general events
  * Default: `true`
* `transcripts.enabled` [`<Boolean>`][] Enabling logging to file
  * Default: `false`
* `transcripts.location` [`<String>`][] The directory to store log files
  * Default: `null`
* `part.message` [`<String>`][] The default part message
  * Default: `eyearesee https://github.com/evanlucas/eyearesee`
* `persist.password` [`<Boolean>`][] Store password in keychain
  * Default: `false`
* `messages.limit` [`<Number>`][] The total number of message to keep
  * Default: 300

If either `channels` or `queries` are passed, they must be an [`<Array>`][]
of [`<Channel>`][] objects.


##### connect()

Actually attempts to connect the socket. If the `connect.auto` setting
is set to `true`, it is not necessary to call this.


##### send(target, msg)

Sends the given `msg` to the target(s).

* `target` [`<String>`][] | [`<Array>`][] The user or channel to which the
  message will be sent
* `msg` [`<String>`][] The actual message


##### addChannel(opts)

Creates a new channel and adds it the the connection.
`opts` can contain the following fields:

* `name` [`<String>`][]
* `topic` [`<String>`][]
* `nick` [`<String>`][]
* `messages` [`<Array>`][]
* `unread` [`<Number>`][]

Returns [`<Channel>`][]


##### removeChannel(name)

Removes the channel with the given name.

* `name` [`<String>`][]


##### addQuery(opts)

Creates a new query and adds it the the connection.
`opts` can contain the following fields:

* `name` [`<String>`][]
* `topic` [`<String>`][]
* `nick` [`<String>`][]
* `messages` [`<Array>`][]
* `unread` [`<Number>`][]

Returns [`<Channel>`][]


##### removeQuery(name)

Removes the query with the given name.

* `name` [`<String>`][]


##### toJSON()

Returns a JSON representation of the connection. This is useful for things like
persisting the connection into a database.

##### Event: 'channelAdded'

Emitted whenever a channel has been added.

`function(channel) { }`

`channel` will be a [`<Channel>`][] object.


##### Event: 'channelRemoved'

Emitted whenever a channel has been removed.

`function(channel) { }`

`channel` will be a [`<Channel>`] object.


##### Event: 'queryAdded'

Emitted whenever a query has been added.

`function(query) { }`

`query` will be a [`<Channel>`][] object.


##### Event: 'queryRemoved'

Emitted whenever a query has been removed.

`function(query) { }`

`query` will be a [`<Channel>`] object.


##### Event: 'channelUpdated'

Emitted whenever a channel or query with this connection has been updated.
This is useful to know when you need to render views, etc.

`function(channel) { }`

`channel` will be a [`<Channel>`] object.


##### Event: 'log'

`function(msg) { }`

Emitted whenever a log message has been added to the connection.
This will happen for things like the MOTD, notices, channel topics, etc.
`msg` will contain the following fields:

* `type` [`<String>`][] The log type
* `from` [`<String>`][]
* `message` [`<String>`][] The actual message
* `ts` [`<Date>`][]
* `channel` [`<String>`][]


##### Event: 'whois'

`function(user) { }`

Emitted whenever a `RPL_ENDOFWHOIS` message is received. `user` will contain
the following fields:

* `nickname` [`<String>`][]
* `username` [`<String>`][]
* `hostname` [`<String>`][]
* `realname` [`<String>`][]
* `channels` [`<Array>`][]
* `oper` [`<Boolean>`][]


##### Event: 'invite'

`function(msg) { }`

Emitted whenever a user is invited to a channel. `msg` will contain
the following fields:

* `hostmask` [`<Object>`][]
* `from` [`<String>`][]
* `to` [`<String>`][]
* `channel` [`<String>`][]


[`<Array>`]: https://mdn.io/array
[`<Boolean>`]: https://mdn.io/boolean
[`<Date>`]: https://mdn.io/date
[`<Function>`]: https://mdn.io/function
[`<Number>`]: https://mdn.io/number
[`<Object>`]: https://mdn.io/object
[`<String>`]: https://mdn.io/string
[`<Channel>`]: channel.html
