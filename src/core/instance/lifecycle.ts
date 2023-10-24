// 这段代码是Vue.js框架中关于组件生命周期管理的关键部分。
// Vue的生命周期包括beforeCreate、created、beforeMount、mounted、beforeUpdate、updated、beforeDestroy、destroyed等钩子函数，
// 开发者可以在这些钩子函数中编写自己的逻辑，实现在不同阶段执行特定的操作。
// 在这段代码中，
// callHook 函数用于触发生命周期钩子函数，mountComponent 函数用于挂载组件，updateChildComponent 函数用于更新子组件，
// activateChildComponent 和 deactivateChildComponent 函数用于激活和禁用子组件。

import config from '../config' // 从配置文件中导入相关配置
import Watcher, { WatcherOptions } from '../observer/watcher' // 导入观察者 Watcher 和 Watcher 的选项类型 WatcherOptions
import { mark, measure } from '../util/perf' // 导入性能相关的函数
import VNode, { createEmptyVNode } from '../vdom/vnode' // 导入虚拟节点 VNode 及空节点的创建函数
import { updateComponentListeners } from './events' // 导入事件相关的更新函数
import { resolveSlots } from './render-helpers/resolve-slots' // 导入解析插槽的帮助函数
import { toggleObserving } from '../observer/index' // 导入观察者模块的相关函数
import { pushTarget, popTarget } from '../observer/dep' // 导入观察者模块的 pushTarget 和 popTarget 函数
import type { Component } from 'types/component'
import type { MountedComponentVNode } from 'types/vnode'

// 导入一些工具函数和常量
import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'
import { currentInstance, setCurrentInstance } from 'v3/currentInstance' // 导入当前实例相关的函数和常量
import { getCurrentScope } from 'v3/reactivity/effectScope' // 导入响应式作用域的相关函数
import { syncSetupProxy } from 'v3/apiSetup' // 导入响应式模块的设置代理函数

// 全局变量，用于存储当前激活的 Vue 实例和更新子组件的标志
export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

// 设置当前激活的 Vue 实例
export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}

// 初始化 Vue 实例的生命周期相关属性和方法
export function initLifecycle(vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  // 查找第一个非抽象父级组件，将当前实例添加到其子组件列表中
  let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }

  vm.$parent = parent
  vm.$root = parent ? parent.$root : vm

  vm.$children = []
  vm.$refs = {}

  // 初始化提供的数据
  vm._provided = parent ? parent._provided : Object.create(null)
  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

// 定义 Vue 实例的生命周期相关方法
export function lifecycleMixin(Vue: typeof Component) {
  // 定义 Vue 实例的 _update 方法，用于更新 vnode
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points -- Vue.prototype.__patch__ 是在入口点根据所使用的渲染后端注入的
    // based on the rendering backend used. -- 根据不同的渲染后端，会有不同的实现
    if (!prevVnode) {
      // initial render -- 初次渲染
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates -- 更新
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference -- 更新 __vue__ 引用
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well -- 如果父组件是一个高阶组件（HOC），也更新其 $el 属性
    let wrapper: Component | undefined = vm
    while (
      wrapper &&
      wrapper.$vnode &&
      wrapper.$parent &&
      wrapper.$vnode === wrapper.$parent._vnode
    ) {
      wrapper.$parent.$el = wrapper.$el
      wrapper = wrapper.$parent
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
    // 调用 updated 钩子函数，确保子组件在父组件的 updated 钩子函数中更新
  }

  // 定义 $forceUpdate 方法，用于强制更新组件
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  // 定义 $destroy 方法，用于销毁组件
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    if (vm._isBeingDestroyed) {
      return
    }
    // 调用 beforeDestroy 钩子函数
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent -- 从父组件中移除当前组件
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown scope. this includes both the render watcher and other
    // watchers created
    // 销毁作用域。包括渲染 watcher 和其它创建的 watcher
    vm._scope.stop()
    // remove reference from data ob -- 从数据对象中移除引用
    // frozen object may not have observer. -- 冻结的对象可能没有观察者。
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook... -- 设置销毁标志
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree -- 调用 __patch__ 方法将 vnode 设置为 null，从而销毁组件
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook -- 调用 destroyed 钩子函数
    callHook(vm, 'destroyed')
    // turn off all instance listeners. -- 关闭所有实例监听器
    vm.$off()
    // remove __vue__ reference -- 移除 __vue__ 引用
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759) -- 释放循环引用 (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// 定义 mountComponent 函数，用于挂载组件
export function mountComponent(
  vm: Component,
  el: Element | null | undefined,
  hydrating?: boolean
): Component {
  vm.$el = el
  if (!vm.$options.render) {
    // @ts-expect-error invalid type
    vm.$options.render = createEmptyVNode
    if (__DEV__) {
      /* istanbul ignore if */
      if (
        (vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el ||
        el
      ) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
            'compiler is not available. Either pre-compile the templates into ' +
            'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 调用 beforeMount 钩子函数
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if -- 性能标记 */
  if (__DEV__ && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // 创建渲染 watcher，用于触发组件的更新
  const watcherOptions: WatcherOptions = {
    before() {
      if (vm._isMounted && !vm._isDestroyed) {
        // 调用 beforeUpdate 钩子函数
        callHook(vm, 'beforeUpdate')
      }
    }
  }

  if (__DEV__) {
    watcherOptions.onTrack = e => callHook(vm, 'renderTracked', [e])
    watcherOptions.onTrigger = e => callHook(vm, 'renderTriggered', [e])
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 在渲染 watcher 中设置 this 为当前组件实例，isRenderWatcher 为 true
  // 这样在更新过程中，如果触发了子组件的渲染 watcher，也会正确设置 activeInstance
  new Watcher(
    vm,
    updateComponent,
    noop,
    watcherOptions,
    true /* isRenderWatcher */
  )
  hydrating = false

  // flush buffer for flush: "pre" watchers queued in setup() -- 刷新缓冲区，处理在 setup() 中添加到 flush: "pre" 的 watcher
  const preWatchers = vm._preWatchers
  if (preWatchers) {
    for (let i = 0; i < preWatchers.length; i++) {
      preWatchers[i].run()
    }
  }

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // 如果 $vnode 为 null，说明是手动挂载的实例，调用 mounted 钩子函数
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

// 定义 updateChildComponent 函数，用于更新子组件
export function updateChildComponent(
  vm: Component,
  propsData: Record<string, any> | null | undefined,
  listeners: Record<string, Function | Array<Function>> | undefined,
  parentVnode: MountedComponentVNode,
  renderChildren?: Array<VNode> | null
) {
  if (__DEV__) {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  // 确定组件是否有插槽子节点
  // 在覆盖 $options._renderChildren 之前，我们需要先进行检查。
  // 检查是否有动态作用域插槽（手写的或者编译时带有动态插槽名称的插槽）。
  // 从模板编译的静态作用域插槽带有 "$stable" 标记。
  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key) ||
    (!newScopedSlots && vm.$scopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  // 如果父节点的静态插槽或者动态插槽有变化，需要强制更新以确保正确性。
  let needsForceUpdate = !!(
    renderChildren || // has new static slots -- 有新的静态插槽
    vm.$options._renderChildren || // has old static slots -- 有旧的静态插槽
    hasDynamicScopedSlot
  )

  const prevVNode = vm.$vnode
  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render -- 更新 vm 的占位节点，而不重新渲染

  if (vm._vnode) {
    // update child tree's parent -- 更新子树的父级
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  // 更新 $attrs 和 $listeners 对象
  // 由于它们是响应式的，如果子组件在渲染过程中使用了它们，可能会触发子组件更新
  const attrs = parentVnode.data.attrs || emptyObject
  if (vm._attrsProxy) {
    // force update if attrs are accessed and has changed since it may be
    // passed to a child component.
    // 如果访问了 attrs，并且 attrs 自上次访问以来已经发生变化，可能传递给子组件，需要强制更新。
    if (
      syncSetupProxy(
        vm._attrsProxy,
        attrs,
        (prevVNode.data && prevVNode.data.attrs) || emptyObject,
        vm,
        '$attrs'
      )
    ) {
      needsForceUpdate = true
    }
  }
  vm.$attrs = attrs

  // update listeners -- 更新 listeners
  listeners = listeners || emptyObject
  const prevListeners = vm.$options._parentListeners
  if (vm._listenersProxy) {
    syncSetupProxy(
      vm._listenersProxy,
      listeners,
      prevListeners || emptyObject,
      vm,
      '$listeners'
    )
  }
  vm.$listeners = vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, prevListeners)

  // update props -- 更新 props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow? -- Flow 类型
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData -- 保持原始的 propsData
    vm.$options.propsData = propsData
  }

  // resolve slots + force update if has children -- // 解析插槽并强制更新子组件
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (__DEV__) {
    isUpdatingChildComponent = false
  }
}

// 判断组件是否在非活动的树中
function isInInactiveTree(vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

// 激活子组件
export function activateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  // 如果组件处于非活动状态，或者为 null，则激活它
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    // 递归激活所有子组件
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    // 调用 activated 钩子函数
    callHook(vm, 'activated')
  }
}

// 禁用子组件
export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  // 如果组件不处于非活动状态，则禁用它
  if (!vm._inactive) {
    vm._inactive = true
    // 递归禁用所有子组件
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    // 调用 deactivated 钩子函数
    callHook(vm, 'deactivated')
  }
}

// 调用生命周期钩子函数
export function callHook(
  vm: Component,
  hook: string,
  args?: any[],
  setContext = true
) {
  // #7573 disable dep collection when invoking lifecycle hooks -- 禁用在调用生命周期钩子函数时收集依赖
  pushTarget()
  // 保存之前的实例和作用域
  const prevInst = currentInstance
  const prevScope = getCurrentScope()
  // 设置上下文为当前实例
  setContext && setCurrentInstance(vm)
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  // 调用钩子函数
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, args || null, vm, info)
    }
  }
  // 如果组件定义了 hook 事件，触发该事件
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  // 恢复之前的实例和作用域
  if (setContext) {
    setCurrentInstance(prevInst)
    prevScope && prevScope.on()
  }

  // 恢复依赖收集
  popTarget()
}
