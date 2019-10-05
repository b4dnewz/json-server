<template lang="html">
  <main>
    <div class="container">
      <div id="resources">
        <h4>Resources</h4>
        <div v-if="Object.keys(resources).length">
          <ul>
            <li v-for="(value, key) in resources">
              <a :href="buildURL(key)">/{{key}} <sup>{{value.length}}</sup></a>
            </li>
          </ul>
          <p>
            To access and modify resources, you can use any HTTP method
          </p>
          <p>
            <code>GET</code>
            <code>POST</code>
            <code>PUT</code>
            <code>PATCH</code>
            <code>DELETE</code>
          </p>
        </div>
        <div v-else>
          <p>No resources found</p>
        </div>
      </div>

      <div id="custom-routes" v-if="rules">
        <h4>Custom Routes</h4>
        <table>
          <tr v-for="(key, rule) in rules">
            <td>{{key}}</td>
            <td>⇢ {{rule}}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h4>Documentation</h4>
        <p>
          View
          <a href="https://github.com/typicode/json-server">README</a>
        </p>
      </div>
    </div>
  </main>
</template>

<script>
export default {
  name: "App",
  data() {
    return {
      endpoint: process.env.VUE_APP_ENDPOINT || '',
      resources: {},
      rules: null
    }
  },
  methods: {
    buildURL(input) {
      return `${this.endpoint}/${input}`
    }
  },
  created() {
    window.fetch(this.buildURL('db'))
      .then(res => res.json())
      .then(res => {
        this.resources = res
      })

    window.fetch(this.buildURL('__rules'))
      .then(res => {
        if (!response.ok) { throw response }
        return res.json()
      })
      .then(res => {
        this.rules = res
      })
      .catch(e => {})
  }
}
</script>
