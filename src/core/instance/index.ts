import { initMixin } from './init' // 导入初始化相关的函数
import { stateMixin } from './state' // 导入状态相关的函数
import { renderMixin } from './render' // 导入渲染相关的函数
import { eventsMixin } from './events' // 导入事件相关的函数
import { lifecycleMixin } from './lifecycle' // 导入生命周期相关的函数
import { warn } from '../util/index' // 导入警告工具函数
import type { GlobalAPI } from 'types/global-api' // 导入全局 API 类型

// Vue 构造函数
function Vue(options) {
  // 如果不是使用 new 关键字调用 Vue 构造函数，发出警告
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 初始化 Vue 实例
  this._init(options)
}

//@ts-expect-error Vue has function type -- 在 Vue 构造函数上混入初始化相关的方法
initMixin(Vue)
//@ts-expect-error Vue has function type -- 在 Vue 构造函数上混入状态相关的方法
stateMixin(Vue)
//@ts-expect-error Vue has function type -- 在 Vue 构造函数上混入事件相关的方法
eventsMixin(Vue)
//@ts-expect-error Vue has function type -- 在 Vue 构造函数上混入生命周期相关的方法
lifecycleMixin(Vue)
//@ts-expect-error Vue has function type -- 在 Vue 构造函数上混入渲染相关的方法
renderMixin(Vue)

// 将 Vue 构造函数转换为全局 API 对象，并导出
export default Vue as unknown as GlobalAPI
