//这段代码主要负责编译模板，将模板转换为渲染函数，并处理一些性能测量和警告

import config from 'core/config' // 导入 Vue.js 配置项
import { warn, cached } from 'core/util/index' // 导入工具函数：警告和缓存
import { mark, measure } from 'core/util/perf' // 导入性能测量工具函数

import Vue from './runtime/index' // 导入 Vue 构造函数
import { query } from './util/index' // 导入 DOM 查询函数
import { compileToFunctions } from './compiler/index' // 导入模板编译函数
// 导入一些兼容性相关的函数
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref
} from './util/compat'
// 导入组件和全局 API 的类型声明
import type { Component } from 'types/component'
import type { GlobalAPI } from 'types/global-api'

// 缓存获取指定 ID 元素的 innerHTML 函数
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 保存 Vue.prototype.$mount 方法的引用
const mount = Vue.prototype.$mount
// 重写 Vue.prototype.$mount 方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 根据传入的参数获取 DOM 元素
  el = el && query(el)

  /* istanbul ignore if */
  // 避免将 Vue 挂载到 <html> 或 <body> 元素上，给出警告
  if (el === document.body || el === document.documentElement) {
    __DEV__ &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      )
    return this
  }

  // 获取实例的配置选项
  const options = this.$options
  // resolve template/el and convert to render function
  // 如果配置中没有 render 函数，则尝试编译模板为 render 函数
  if (!options.render) {
    let template = options.template
     // 如果存在模板，则尝试获取模板内容
    if (template) {
      if (typeof template === 'string') {
        // 如果模板是字符串，且以 '#' 开头，认为它是一个 DOM 元素的 ID
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          // 如果在开发环境下找不到模板元素，则给出警告
          if (__DEV__ && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
         // 如果模板是一个 DOM 元素，则获取它的 innerHTML
        template = template.innerHTML
      } else {
        if (__DEV__) {
          // 如果模板无效，则在开发环境下给出警告
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果没有指定模板，并且存在挂载元素，则获取挂载元素的 outerHTML
      // @ts-expect-error
      template = getOuterHTML(el)
    }
    // 如果成功获取模板，则尝试将模板编译为渲染函数
    if (template) {
      /* istanbul ignore if */
      // 在性能测量开启的情况下，标记编译的开始时间
      if (__DEV__ && config.performance && mark) {
        mark('compile')
      }

      // 调用编译函数，将模板编译为渲染函数
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: __DEV__,
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        },
        this
      )
      // 将编译得到的渲染函数和静态渲染函数保存到配置选项中
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
       // 在性能测量开启的情况下，标记编译的结束时间，进行性能测量
      if (__DEV__ && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用原始的 $mount 方法，将实例挂载到指定的 DOM 元素上
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 * 获取元素的 outerHTML，同时兼容处理 SVG 元素在 IE 中的问题
 */
function getOuterHTML(el: Element): string {
  // 如果元素本身有 outerHTML 属性，则直接返回
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    // 否则，创建一个 div 元素，将 el 克隆到 div 中，再获取 div 的 innerHTML
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

// 将编译模板的函数 Vue.compile 挂载到 Vue 构造函数上
Vue.compile = compileToFunctions

// 将修改后的 Vue 构造函数作为 GlobalAPI 导出
export default Vue as GlobalAPI
