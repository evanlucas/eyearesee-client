# Settings

```js
const Settings = require('eyearesee-client').Settings
```

### API

#### Settings(defaults, connection)

* `defaults` [`<Map>`][] A set of default values
* `connection` [`<Connection>`][] The connection


##### getConnection()

Returns the [`<Connection>`][] associated with this settings object.


##### get(key)

Returns the value for the given _key_. If the _key_ does not exist,
the value will be read for the `defaults` object passed in the constructor.

* `key` Same thing that a [`<Map>`][] accepts


##### set(key, val)

Sets the _val_ for the given _key_.

* `key` Same thing that a [`<Map>`][] accepts
* `val` Same thing that a [`<Map>`][] accepts

Will emit the `'settingChanged'` event if _val_ is not strictly equal to the
original value for _key_.


##### toJSON()

Returns a JSON representation of the current settings.

**Note: It does not support any objects that cannot be serialized
by `JSON.stringify()`**


##### load(opts)

* `opts` [`<Object>`][] An object to preload into the settings.

It can be useful to pre-populate the settings. This makes that easier.


##### Event: 'settingChanged'

`function(key, originalValue, newValue) { }`

Emitted whenever a setting is changed.

[`<Object>`]: https://mdn.io/object
[`<Map>`]: https://mdn.io/map
[`<Connection>`]: connection.md
