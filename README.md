<h1 align="center">Docker 网盘</h1>
<p>
  <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/gamekingv/docker-drive">
  <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/gamekingv/docker-drive/total">
  <img alt="GitHub issues" src="https://img.shields.io/github/issues/gamekingv/docker-drive">
  <img alt="GitHub closed issues" src="https://img.shields.io/github/issues-closed/gamekingv/docker-drive">
</p>

> 基于 Docker 仓库协议的chrome浏览器扩展，可以将目前众多的免费容器仓库服务用于网盘存储，下载和分享。

## :rocket: 安装
下载 [Release](https://github.com/gamekingv/docker-drive/releases) 内编译好的extension.zip压缩包并解压，打开chrome的开发者模式，加载解压缩的扩展包即可。

## :dart: 使用说明

> 参考 [Docker Register Cloud](https://github.com/xausky/DockerRegisterCloud) 项目说明新建一个镜像仓库，然后打开扩展，根据刚刚新建的仓库信息添加仓库即可。注意请勿和Docker Register Cloud一起使用，本扩展与Docker Register Cloud的配置不兼容，使用本扩展后将无法使用Docker Register Cloud管理。
* [x] 直接上传下载，并支持批量推送至Aria2下载。
* [x] 在线预览图片，支持翻页预览同文件夹下的所有图片。
* [x] 在线预览视频（仅浏览器支持的格式）。
* [x] 预览视频时外挂字幕，支持srt/ass/ssa/vtt格式（需要与视频文件同名，类似视频播放软件加载字幕的规则，后缀可以是类似.sc.ass等形式）。
* [x] 支持添加多个仓库。

## :dvd: 项目编译

> 编译后的扩展生成在extension文件夹里

### 安装依赖
```
yarn install
```

### 编译生成扩展
```
yarn build
```
