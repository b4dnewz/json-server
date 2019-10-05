# `@json/cli`

> Command line module that provide a fully working REST JSON server

## Getting started

Install JSON Server global module:

```
npm install -g @json-server/cli
```

Create a database file `db.json` with some data:

```json
{
  "posts": [{
    "id": 1,
    "title": "json-server"
  }],
  "comments": [{
    "id": 1,
    "body": "some comment",
    "postId": 1
  }],
  "profile": {
    "id": 1,
    "name": "johnny foo"
  }
}
```

Start JSON Server from the command line using the database file:

```
$ json-server db.json
```

The REST JSON server should be accessible using the default hostname and port http://localhost:3000

---

## License

MIT License © [Filippo Conti](https://b4dnewz.github.io/)
