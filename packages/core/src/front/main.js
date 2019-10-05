import Vue from 'vue';
import App from './app';
import style from './style.css'

new Vue({
  el: '#app',
  render: h => h(App),
  components: { App },
});
