//一个用于构建Vue.js不同版本的Rollup配置文件，包括运行时版本、包含编译器版本、用于浏览器端和服务器端的版本等。
// 引入必要的模块和工具
const path = require('path')
const alias = require('@rollup/plugin-alias') // Rollup插件，用于设置别名
const cjs = require('@rollup/plugin-commonjs') // Rollup插件，用于处理CommonJS模块
const replace = require('@rollup/plugin-replace') // Rollup插件，用于替换文件中的字符串
const node = require('@rollup/plugin-node-resolve').nodeResolve // Rollup插件，用于解析Node.js模块
const ts = require('rollup-plugin-typescript2') // Rollup插件，用于处理TypeScript文件

// 从环境变量或package.json中获取Vue.js的版本号
const version = process.env.VERSION || require('../package.json').version
// 加载特性标志（feature flags）
const featureFlags = require('./feature-flags')

// Vue.js的版权声明
const banner =
  '/*!\n' +
  ` * Vue.js v${version}\n` +
  ` * (c) 2014-${new Date().getFullYear()} Evan You\n` +
  ' * Released under the MIT License.\n' +
  ' */'

// 别名配置，用于解析模块路径
const aliases = require('./alias')
const resolve = p => {
  const base = p.split('/')[0]
  if (aliases[base]) {
    return path.resolve(aliases[base], p.slice(base.length + 1))
  } else {
    return path.resolve(__dirname, '../', p)
  }
}

// we are bundling forked consolidate.js in compiler-sfc which dynamically -- 我们正在编译（打包）在 compiler-sfc 中分支修改过的 consolidate.js。
// requires a ton of template engines which should be ignored. -- 在这个过程中，consolidate.js 动态地引入了很多模板引擎，但我们希望忽略（不处理）这些引入，只关注 consolidate.js 的核心功能。
const consolidatePath = require.resolve('@vue/consolidate/package.json', {
  paths: [path.resolve(__dirname, '../packages/compiler-sfc')]
})

// 配置不同构建版本的选项
const builds = {
  // Runtime only (CommonJS). Used by bundlers e.g. Webpack & Browserify -- 运行时版本（仅包含运行时），用于模块打包工具（如Webpack和Browserify）
  'runtime-cjs-dev': {
    entry: resolve('web/entry-runtime.ts'),
    dest: resolve('dist/vue.runtime.common.dev.js'),
    format: 'cjs',
    env: 'development',
    banner
  },
  'runtime-cjs-prod': {
    entry: resolve('web/entry-runtime.ts'),
    dest: resolve('dist/vue.runtime.common.prod.js'),
    format: 'cjs',
    env: 'production',
    banner
  },
  // Runtime+compiler CommonJS build (CommonJS) -- 包含编译器的运行时版本（CommonJS模块）
  'full-cjs-dev': {
    entry: resolve('web/entry-runtime-with-compiler.ts'),
    dest: resolve('dist/vue.common.dev.js'),
    format: 'cjs',
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },
  'full-cjs-prod': {
    entry: resolve('web/entry-runtime-with-compiler.ts'),
    dest: resolve('dist/vue.common.prod.js'),
    format: 'cjs',
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime only ES modules build (for bundlers) -- 仅运行时版本（ES模块），适用于支持ES模块的模块打包工具，如Rollup和Webpack 2
  'runtime-esm': {
    entry: resolve('web/entry-runtime-esm.ts'),
    dest: resolve('dist/vue.runtime.esm.js'),
    format: 'es',
    banner
  },
  // Runtime+compiler ES modules build (for bundlers) -- 运行时+编译器的ES模块版本，适用于支持ES模块的模块打包工具，如Rollup和Webpack 2
  'full-esm': {
    entry: resolve('web/entry-runtime-with-compiler-esm.ts'),
    dest: resolve('dist/vue.esm.js'),
    format: 'es',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime+compiler ES modules build (for direct import in browser) -- 运行时+编译器的ES模块版本，可在浏览器中直接导入使用
  'full-esm-browser-dev': {
    entry: resolve('web/entry-runtime-with-compiler-esm.ts'),
    dest: resolve('dist/vue.esm.browser.js'),
    format: 'es',
    transpile: false,
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime+compiler ES modules build (for direct import in browser) -- 运行时+编译器的ES模块版本，可在浏览器中直接导入使用
  'full-esm-browser-prod': {
    entry: resolve('web/entry-runtime-with-compiler-esm.ts'),
    dest: resolve('dist/vue.esm.browser.min.js'),
    format: 'es',
    transpile: false,
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },
  // runtime-only build (Browser) -- 仅运行时版本（浏览器端）
  'runtime-dev': {
    entry: resolve('web/entry-runtime.ts'),
    dest: resolve('dist/vue.runtime.js'),
    format: 'umd',
    env: 'development',
    banner
  },
  // runtime-only production build (Browser)
  'runtime-prod': {
    entry: resolve('web/entry-runtime.ts'),
    dest: resolve('dist/vue.runtime.min.js'),
    format: 'umd',
    env: 'production',
    banner
  },
  // Runtime+compiler development build (Browser) -- 运行时+编译器版本（浏览器端），适用于开发环境
  'full-dev': {
    entry: resolve('web/entry-runtime-with-compiler.ts'),
    dest: resolve('dist/vue.js'),
    format: 'umd',
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime+compiler production build  (Browser) -- 运行时+编译器版本（浏览器端），适用于生产环境
  'full-prod': {
    entry: resolve('web/entry-runtime-with-compiler.ts'),
    dest: resolve('dist/vue.min.js'),
    format: 'umd',
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },
  // Web compiler (CommonJS). -- Web编译器版本（CommonJS模块），用于构建Web模板编译器
  compiler: {
    entry: resolve('web/entry-compiler.ts'),
    dest: resolve('packages/template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(
      require('../packages/template-compiler/package.json').dependencies
    )
  },
  // Web compiler (UMD for in-browser use). -- Web编译器版本（UMD模块，供浏览器使用），用于在浏览器中使用Vue的编译器
  'compiler-browser': {
    entry: resolve('web/entry-compiler.ts'),
    dest: resolve('packages/template-compiler/browser.js'),
    format: 'umd',
    env: 'development',
    moduleName: 'VueTemplateCompiler',
    plugins: [node(), cjs()]
  },
  // Web server renderer (CommonJS). -- Web服务器端渲染版本（CommonJS模块）
  'server-renderer-dev': {
    entry: resolve('packages/server-renderer/src/index.ts'),
    dest: resolve('packages/server-renderer/build.dev.js'),
    format: 'cjs',
    env: 'development',
    external: [
      'stream',
      ...Object.keys(
        require('../packages/server-renderer/package.json').dependencies
      )
    ]
  },
  'server-renderer-prod': {
    entry: resolve('server/index.ts'),
    dest: resolve('packages/server-renderer/build.prod.js'),
    format: 'cjs',
    env: 'production',
    external: [
      'stream',
      ...Object.keys(
        require('../packages/server-renderer/package.json').dependencies
      )
    ]
  },
  'server-renderer-basic': {
    entry: resolve('server/index-basic.ts'),
    dest: resolve('packages/server-renderer/basic.js'),
    format: 'umd',
    env: 'development',
    moduleName: 'renderVueComponentToString',
    plugins: [node(), cjs()]
  },
  'server-renderer-webpack-server-plugin': {
    entry: resolve('server/webpack-plugin/server.ts'),
    dest: resolve('packages/server-renderer/server-plugin.js'),
    format: 'cjs',
    external: Object.keys(
      require('../packages/server-renderer/package.json').dependencies
    )
  },
  'server-renderer-webpack-client-plugin': {
    entry: resolve('server/webpack-plugin/client.ts'),
    dest: resolve('packages/server-renderer/client-plugin.js'),
    format: 'cjs',
    external: Object.keys(
      require('../packages/server-renderer/package.json').dependencies
    )
  },
  'compiler-sfc': {
    entry: resolve('packages/compiler-sfc/src/index.ts'),
    dest: resolve('packages/compiler-sfc/dist/compiler-sfc.js'),
    format: 'cjs',
    external: Object.keys(
      require('../packages/compiler-sfc/package.json').dependencies
    ),
    plugins: [
      node({ preferBuiltins: true }),
      cjs({
        ignore: [
          ...Object.keys(require(consolidatePath).devDependencies),
          'vm',
          'crypto',
          'react-dom/server',
          'teacup/lib/express',
          'arc-templates/dist/es5',
          'then-pug',
          'then-jade'
        ]
      })
    ]
  }
}

// 生成Rollup配置的函数
function genConfig(name) {
  const opts = builds[name]
  const isTargetingBrowser = !(
    opts.transpile === false || opts.format === 'cjs'
  )

  // console.log('__dir', __dirname)
  const config = {
    input: opts.entry,
    external: opts.external,
    plugins: [
      // 设置别名
      alias({
        entries: Object.assign({}, aliases, opts.alias)
      }),
      // 处理TypeScript文件
      ts({
        tsconfig: path.resolve(__dirname, '../', 'tsconfig.json'),
        cacheRoot: path.resolve(__dirname, '../', 'node_modules/.rts2_cache'),
        tsconfigOverride: {
          compilerOptions: {
            // if targeting browser, target es5 -- 如果目标是浏览器，设置为es5
            // if targeting node, es2017 means Node 8 -- 如果目标是Node.js，es2017意味着Node 8
            target: isTargetingBrowser ? 'es5' : 'es2017'
          },
          include: isTargetingBrowser ? ['src'] : ['src', 'packages/*/src'],
          exclude: ['test', 'test-dts']
        }
      })
    ].concat(opts.plugins || []),
    output: {
      file: opts.dest,
      format: opts.format,
      banner: opts.banner,
      name: opts.moduleName || 'Vue',
      exports: 'auto'
    },
    // 处理警告信息
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg)
      }
    }
  }

  // console.log('pluging', config.plugins)

  // 内置变量
  // built-in vars
  const vars = {
    __VERSION__: version,
    __DEV__: `process.env.NODE_ENV !== 'production'`,
    __TEST__: false,
    __GLOBAL__: opts.format === 'umd' || name.includes('browser')
  }
  // 特性标志
  // feature flags
  Object.keys(featureFlags).forEach(key => {
    vars[`process.env.${key}`] = featureFlags[key]
  })
  // 构建特定的环境
  // build-specific env
  if (opts.env) {
    vars['process.env.NODE_ENV'] = JSON.stringify(opts.env)
    vars.__DEV__ = opts.env !== 'production'
  }

  vars.preventAssignment = true
  config.plugins.push(replace(vars))

  Object.defineProperty(config, '_name', {
    enumerable: false,
    value: name
  })

  return config
}

// 如果有指定的构建目标，导出对应的配置
if (process.env.TARGET) {
  module.exports = genConfig(process.env.TARGET)
} else {
  // 导出所有构建版本的配置
  exports.getBuild = genConfig
  exports.getAllBuilds = () => Object.keys(builds).map(genConfig)
}
