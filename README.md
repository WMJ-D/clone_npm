# clone_npm

## 项目介绍
- 专属于前端开发者的快捷工具
- 一个自定义命令行工具，打通git clone 和 npm install的流程，解决项目开发中项目切换和项目依赖安装的问题

## 环境要求
- Node.js >= 14

## 适用场景
- 负责多项目，集中处理多个系统代码
- 快速打开项目
- 快速切换项目
- 快速重新安装项目依赖
- 等等

## 主要功能
- 项目运行IDE配置
- 项目基本代码信息配置
- git clone 项目到本地并自动安装项目依赖并自动在IDE中打开项目

## 安装
```bash
npm install -g @wmj-code/clone_npm
```

## 使用
```bash
cn
```
执行后会显示使用方法以及UI界面

## 注意事项
- PowerShell请在管理员权限下执行命令
- 下载npm依赖时，请确保您本地的项目未运行

## 版本记录

- 1.0.5 增加桌面端，请在全局node包下找到依赖@wmj-code/clone_npm，打开文件夹 Clone-NPM Desktop Setup 1.0.0
