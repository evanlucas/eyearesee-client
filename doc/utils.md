# utils

```js
const utils = require('eyearesee-client').utils
```

### API

#### utils.hostmask(msg)

Returns an [`<Object>`][] that represents the message hostmask.

It will contain the following properties:

* `nick` [`<String>`][]
* `username` [`<String>`][]
* `hostname` [`<String>`][]
* `string` [`<String>`][]


#### utils.getTarget(targets)

Joins the given _targets_ into a [`<String>`][] joined by `,`

* `targets` [`<String>`][] | [`<Array>`][]


[`<Array>`]: https://mdn.io/array
[`<Object>`]: https://mdn.io/object
[`<String>`]: https://mdn.io/string
