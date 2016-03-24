# Channel

```js
const Channel = require('eyearesee-client').Channel
```

> A channel represents either an IRC channel or a private message (query).

### API

#### Channel(opts)

* `opts` [`<Object>`][] Set of configurable options.
  Can have the following fields:
  * `name` [`<String>`][] **(Required)** The channel name.
    * If `type` is `'channel'`, it should be the channel name
    * If `type` is `'private'`, it should be the nickname of the other user.
  * `topic` [`<String>`][] The channel topic.
  * `messages` [`<Array>`][] An array of [`<Message>`][] objects.
  * `type` [`<String>`][] The type. Must be one of the following:
    * `'channel'` *(Default)* For channels
    * `'private'` For queries
  * `mode` [`<String>`][] The channel mode
  * `connection` [`<Connection>`][] The connection
  * `nick` [`<String>`][] Your client's nickname
  * `joined` [`<Boolean>`][] Whether or not this channel is joined
  * `unread` [`<Number>`][] The number of unread messages
  * `from` [`<String>`][] Who this query is from


##### users

A [`<Map>`][] that represents the users currently in the channel.
The key will be the user's lowercased nickname.
The value will be a [`<User>`][] object.


##### getConnection()

Will return the [`<Connection>`][] for this channel.


##### setTopic(topic, who)

* `topic` [`<String>`][] The topic
* `who` [`<String>`][] The nickname of the user that changed the topic

It is recommended to use this to change the topic in order to get
logging of the changes to the logs.


##### setTopicChanged(by, at)

* `by` [`<String>`][] The nickname of the user that changed the topic
* `at` [`<String>`][] | [`<Number>`][] A numeric representation of the timestamp

It is recommended to use this to change the topic info in order to get
logging of the changes to the logs.


##### setMode(mode)

* `mode` [`<String>`][] Set the mode of the channel

It is recommended to use this to change the mode in order to get
logging of the changes to the logs.


##### addMessage(opts)

Adds a new [`<Message>`][] to the channel.

* `message` [`<String>`][] The message contents
* `type` [`<String>`][] The message type
* `to` [`<String>`][] The recipient of the message
* `from` [`<String>`][] The sender of the message
* `hostmask` [`<Object>`][] The hostmask of the message
* `ts` [`<Date>`][] The timestamp of the message
* `mention` [`<Boolean>`][] Is this a mention?

This will emit a `'log'` event.


##### send(msg)

Sends a [`<Message>`][] with the type `'message'`.

Will also add the message to the channel.


##### action(msg)

Sends a [`<Message>`][] with the type `'action'`.

Will also add the message to the channel.


##### addUser(opts)

Adds a user to the channel.

* `nickname` [`<String>`][]
* `username` [`<String>`][]
* `address` [`<String>`][]
* `realname` [`<String>`][]
* `mode` [`<String>`][]
* `color` [`<String>`][] The color for this user.

**Note: `color` is more of an implementation detail of eyearesee.
It should probably be moved out of here.**


##### partAndDestroy()

Sends a `PART` message (if this is a channel) and destroys the channel.
This will remove the channel from the connection.


##### toJSON()

Returns a JSON representation of the channel. This is useful for things like
persisting the channel into a database.


##### Event: 'mention'

Will be emitted whenever a message is added with a mention of the current
nick.


##### Event: 'log'

Will be emitted whenever a message is added.


[`<Array>`]: https://mdn.io/array
[`<Boolean>`]: https://mdn.io/boolean
[`<Date>`]: https://mdn.io/date
[`<Object>`]: https://mdn.io/object
[`<Map>`]: https://mdn.io/map
[`<Number>`]: https://mdn.io/number
[`<String>`]: https://mdn.io/string
[`<Connection>`]: connection.md
[`<Message>`]: message.md
[`<User>`]: user.md
