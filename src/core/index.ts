import Vue from './instance/index' // 导入 Vue 构造函数
import { initGlobalAPI } from './global-api/index' // 导入全局 API 初始化函数
import { isServerRendering } from 'core/util/env' // 导入判断是否在服务器端渲染的工具函数
import { FunctionalRenderContext } from 'core/vdom/create-functional-component' // 导入函数式组件的渲染上下文
import { version } from 'v3' // 导入 Vue 版本信息

// 初始化全局 API
initGlobalAPI(Vue)

// 在 Vue 原型上添加 $isServer 属性，表示当前是否在服务器端渲染
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 在 Vue 原型上添加 $ssrContext 属性，表示当前的服务器端渲染上下文
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get() {
    /* istanbul ignore next */
    // 如果存在虚拟节点并且有服务器端渲染上下文，则返回该上下文
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
// 将函数式组件的渲染上下文暴露出去，用于服务器端渲染运行时辅助函数的安装
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

// 设置 Vue 的版本信息
Vue.version = version

// 导出 Vue 构造函数
export default Vue
