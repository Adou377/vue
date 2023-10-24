//这段代码的主要功能是遍历配置文件中的不同构建版本，使用Rollup.js进行模块打包，根据环境选择是否进行代码压缩，最终将打包后的代码写入到对应的文件中。
//在代码中还包括了一些辅助函数，用于处理文件写入、错误处理等逻辑。

// 引入Node.js的文件系统、路径、压缩、Rollup.js打包和代码压缩模块
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const terser = require('terser')

// 如果'dist'目录不存在，则创建它
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

// 从配置文件获取所有的构建版本
let builds = require('./config').getAllBuilds()

// 通过命令行参数筛选构建版本
// filter builds via command line arg
if (process.argv[2]) {
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    // 筛选符合命令行参数的构建版本
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
}

// 开始构建
build(builds)

// 构建函数，逐个构建传入的构建版本配置
function build (builds) {
  let built = 0
  const total = builds.length
  // 构建下一个版本
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++
      // 如果还有未构建的版本，递归调用next函数继续构建
      if (built < total) {
        next()
      }
    }).catch(logError)
  }

  // 开始第一个构建版本的构建
  next()
}

// 构建单个版本的函数
function buildEntry (config) {
  const output = config.output
  const { file, banner } = output
  const isProd = /(min|prod)\.js$/.test(file) // 检查是否为生产环境的标志
  // 使用Rollup.js构建模块
  return rollup.rollup(config)
    .then(bundle => bundle.generate(output))
    .then(async ({ output: [{ code }] }) => {
      if (isProd) {
        // 如果是生产环境，使用terser进行代码压缩
        const {code: minifiedCode} =  await terser.minify(code, {
          toplevel: true,
          compress: {
            pure_funcs: ['makeMap'],
          },
          format: {
            ascii_only: true,
          }
        });
        // 添加banner和压缩后的代码，然后写入文件
        const minified = (banner ? banner + '\n' : '') + minifiedCode
        return write(file, minified, true)
      } else {
        // 否则，直接写入原始代码
        return write(file, code)
      }
    })
}

// 将代码写入文件，并且可以选择是否进行gzip压缩
function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report (extra) {
      // 输出构建信息，包括文件名和文件大小
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }

    // 确保目录存在，如果不存在则创建
    if (!fs.existsSync(path.dirname(dest))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
    }
    // 将代码写入文件
    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        // 如果需要gzip压缩，使用zlib进行压缩
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          // 输出压缩后的文件大小
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        // 否则，直接输出原始文件大小
        report()
      }
    })
  })
}

// 获取文件大小，并且以KB为单位返回
function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

// 打印错误信息
function logError (e) {
  console.log(e)
}

// 返回带颜色的字符串
function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
