import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// 自定义插件：复制 blog 目录到输出
function copyBlogPlugin() {
  return {
    name: 'copy-blog',
    writeBundle(options) {
      const outDir = options.dir || 'out/main'
      const blogSrc = resolve(__dirname, 'electron/main/blog')
      const blogDest = join(outDir, 'blog')
      const serverSrc = resolve(__dirname, 'electron/main/blog-server.js')
      const serverDest = join(outDir, 'blog-server.js')

      // 复制 blog-server.js
      if (existsSync(serverSrc)) {
        copyFileSync(serverSrc, serverDest)
        console.log('[copy-blog] Copied blog-server.js')
      }

      // 复制 blog 目录
      if (existsSync(blogSrc)) {
        if (!existsSync(blogDest)) {
          mkdirSync(blogDest, { recursive: true })
        }
        copyDirSync(blogSrc, blogDest)
        console.log('[copy-blog] Copied blog directory')
      }
    }
  }
}

function copyDirSync(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true })
      }
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyBlogPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.js')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.js')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
