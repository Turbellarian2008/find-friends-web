import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
// Minimal global stub for uni-icons to work on H5 without uni_modules
Vue.component('uni-icons', {
  props: {
    type: { type: String, default: '' },
    size: { type: [String, Number], default: 20 },
    color: { type: String, default: '#333' }
  },
  computed: {
    glyph() {
      const map = {
        right: '›',
        list: '≡',
        flag: '⚑',
        gear: '⚙',
        chat: '💬',
        undo: '↶'
      }
      return map[this.type] || '•'
    },
    pxSize() {
      const n = Number(this.size) || 20
      return n + 'px'
    }
  },
  render(h) {
    return h('span', {
      style: { fontSize: this.pxSize, color: this.color, lineHeight: this.pxSize }
    }, this.glyph)
  }
})
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp, h } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  // Minimal global stub for uni-icons in Vue3
  app.component('uni-icons', {
    props: {
      type: { type: String, default: '' },
      size: { type: [String, Number], default: 20 },
      color: { type: String, default: '#333' }
    },
    computed: {
      glyph() {
        const map = { right: '›', list: '≡', flag: '⚑', gear: '⚙', chat: '💬', undo: '↶' }
        return map[this.type] || '•'
      },
      pxSize() { const n = Number(this.size) || 20; return n + 'px' }
    },
    render() {
      return h('span', { style: { fontSize: this.pxSize, color: this.color, lineHeight: this.pxSize } }, this.glyph)
    }
  })
  return {
    app
  }
}
// #endif