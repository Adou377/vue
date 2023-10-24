import Vue from 'core/index' // 导入 Vue 构造函数
import config from 'core/config' // 导入 Vue 配置项
import { extend, noop } from 'shared/util' // 导入共享的工具函数：扩展和空操作
import { mountComponent } from 'core/instance/lifecycle' // 导入实例生命周期的挂载函数
import { devtools, inBrowser } from 'core/util/index'// 导入开发工具和浏览器环境检测函数

// 导入 DOM 查询函数和一些 DOM 相关的工具函数
import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch' // 导入虚拟 DOM 补丁函数
// 导入平台相关的指令和组件
import platformDirectives from './directives/index'
import platformComponents from './components/index'
// 导入组件类型的声明
import type { Component } from 'types/component'

// install platform specific utils
// 将平台相关的 DOM 检测方法挂载到 Vue.config 上
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// 将平台相关的指令和组件挂载到 Vue.options 上
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// 将平台相关的虚拟 DOM 补丁函数挂载到 Vue.prototype.__patch__
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method -- 公共的挂载方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 如果传入了 el 参数，则查询 el 对应的 DOM 元素
  el = el && inBrowser ? query(el) : undefined
  // 调用实例挂载函数，返回挂载后的组件实例
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
// 如果在浏览器环境下，延迟执行以下代码块
if (inBrowser) {
  setTimeout(() => {
    // 如果配置中启用了开发工具
    if (config.devtools) {
      // 如果浏览器环境支持 Vue Devtools，并且已经加载，初始化 Vue Devtools
      if (devtools) {
        devtools.emit('init', Vue)
         // 如果浏览器环境支持 console，并且在开发环境下，给出下载 Vue Devtools 的提示
      } else if (__DEV__ && process.env.NODE_ENV !== 'test') {
        // @ts-expect-error
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
            'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    // 如果在开发环境下，给出 Vue 运行在开发模式的提示
    if (
      __DEV__ &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      // @ts-expect-error
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
          `Make sure to turn on production mode when deploying for production.\n` +
          `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

// 导出 Vue 构造函数
export default Vue
