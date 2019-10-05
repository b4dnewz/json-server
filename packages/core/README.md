# `@json-server/core`

> Setup a fully working REST JSON server in seconds

## Getting started

Install JSON Server module:

```
npm install @json-server/core
```

Setup your express application:

```js
import {createServer} from "@json-server/core"
const server = createServer("db.json", {
  // server options
})

server.listen(3000, () => {
  console.log('JSON Server is running')
})
```

Start the application:

```
$ node app.js
```

You can also start a __In Memory__ database passing a JSON object instead of a local JSON file:

```js
const server = createServer({
  posts: [{
    id: 1,
    body: "foo"
  }],
  comments:[{
    id: 1,
    body: "bar",
    postId: 1
  }]
})
```

---

## License

[MIT License](./LICENSE) © [Filippo Conti](https://b4dnewz.github.io/)
