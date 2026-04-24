const fs = require('fs')
const path = require('path')

const pkgPath = path.join(__dirname, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 解析版本号 x.y.z
const parts = pkg.version.split('.').map(Number)
parts[2]++ // patch +1

pkg.version = parts.join('.')
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`版本号已更新: ${pkg.version}`)
