# auth

```js
const auth = require('eyearesee-client').auth
```

### API

#### auth.saveCreds(name, user, password)

Save the credentials for the given connection _name_ in the system's keychain.

* `name` [`<String>`][] The connection name
* `user` [`<String>`][] The username
* `password` [`<String>`][] The password


#### auth.getCreds(name, user)

Fetch the credentials for the given connection _name_ from the system's
keychain.

* `name` [`<String>`][] The connection name
* `user` [`<String>`][] The username


[`<String>`]: https://mdn.io/string
