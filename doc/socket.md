# Socket

```js
const Socket = require('eyearesee-client').Socket
```

### API

#### Socket(opts)

* `opts` An [`<Object>`][] of configurable options.
  Can contain the following fields:
  * `secure` [`<Boolean>`][] Use tls
    * Default: `false`
  * `port` [`<Number>`][] The port
    * Default: `6667` or `6697`
  * `host` [`<String>`][] The server
    * Default: `127.0.0.1`
  * `password` [`<String>`][]
  * `username` [`<String>`][]
  * `nickname` [`<String>`][]
  * `realname` [`<String>`][]
  * `altNick` [`<String>`][]

##### TODO(evanlucas)

Finish the rest


[`<Number>`]: https://mdn.io/number
[`<Object>`]: https://mdn.io/object
[`<String>`]: https://mdn.io/string
