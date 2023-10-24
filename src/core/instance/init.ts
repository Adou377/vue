import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'
import type { Component } from 'types/component'
import type { InternalComponentOptions } from 'types/options'
import { EffectScope } from 'v3/reactivity/effectScope'

let uid = 0

// Vue 实例的初始化函数混入，负责初始化 Vue 实例
export function initMixin(Vue: typeof Component) {
  // Vue 实例的 _init 方法，接收一个选项对象
  Vue.prototype._init = function (options?: Record<string, any>) {
    const vm: Component = this
    // a uid -- 为实例生成唯一标识
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if -- 性能标记 */
    if (__DEV__ && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to mark this as a Vue instance without having to do instanceof
    // check
    // 标记当前实例是 Vue 实例
    vm._isVue = true
    // avoid instances from being observed -- 避免实例被观察
    vm.__v_skip = true
    // effect scope -- 创建响应式的 effect 作用域
    vm._scope = new EffectScope(true /* detached */)
    vm._scope._vm = true
    // merge options -- 合并选项
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 优化内部组件实例化，因为动态选项合并非常慢，而且内部组件选项没有特殊处理。
      initInternalComponent(vm, options as any)
    } else {
      // 解析构造函数的选项
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor as any),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (__DEV__) {
      // 初始化代理
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self -- 暴露真实的 Vue 实例
    vm._self = vm
    // 初始化生命周期相关方法
    initLifecycle(vm)
    // 初始化事件相关方法
    initEvents(vm)
    // 初始化渲染相关方法
    initRender(vm)
    // 调用钩子函数 beforeCreate
    callHook(vm, 'beforeCreate', undefined, false /* setContext */)
    // 解析注入
    initInjections(vm) // resolve injections before data/props -- 在数据/属性之前解析注入
    // 初始化提供的数据
    initState(vm)
     // 解析提供的数据（provide）
    initProvide(vm) // resolve provide after data/props -- 在数据/属性之后解析提供的数据
    // 调用钩子函数 created
    callHook(vm, 'created')

    /* istanbul ignore if -- 性能标记结束 */
    if (__DEV__ && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 如果有 el 选项，则挂载到 DOM 上
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

// 初始化内部组件
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create((vm.constructor as any).options))
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions!
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 解析构造函数的选项
export function resolveConstructorOptions(Ctor: typeof Component) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976) -- 检查是否有任何后期修改/附加的选项 (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

// 解析已修改的选项
function resolveModifiedOptions(
  Ctor: typeof Component
): Record<string, any> | null {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
