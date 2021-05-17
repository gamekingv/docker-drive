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

另外提供crx文件，支持自动更新，但chrome以及edge均需要在组策略中添加扩展白名单才能安装。

## :dart: 使用说明

> 参考 [Docker Register Cloud](https://github.com/xausky/DockerRegisterCloud) 项目说明新建一个镜像仓库，然后打开扩展，根据刚刚新建的仓库信息添加仓库即可。注意请勿和Docker Register Cloud一起使用，本扩展与Docker Register Cloud的配置不兼容，使用本扩展后将无法使用Docker Register Cloud管理。
* [x] 直接上传下载，并支持批量推送至Aria2下载。
* [x] 在线预览图片，支持翻页预览同文件夹下的所有图片。
* [x] 在线预览视频（仅浏览器支持的格式）。
* [x] 预览视频时外挂字幕，支持srt/ass/ssa/vtt格式（需要与视频文件同名，类似视频播放软件加载字幕的规则，后缀可以是类似.sc.ass等形式）。
* [x] 支持添加多个仓库。

## :bank: 使用数据库
> 目前此功能仍处于测试阶段。
> 
自 v0.3.5 版本开始支持使用数据库储存配置文件，其中优缺点如下，请自行选择是否使用：
* 优点：支持多终端同时操作，比如同时上传，基本不会出现因同时操作而造成文件丢失的情况
* 缺点：由于使用云数据库，所有操作将会变慢，并且目前只适配了IBM Cloudant数据库。
### 使用方法
1. 到[IBM Cloud官网](https://www.ibm.com/cn-zh/cloud/free)注册一个免费账号。
2. 登陆到[控制台](https://cloud.ibm.com/)
3. [创建](https://cloud.ibm.com/catalog/services/cloudant)一个Cloudant资源，注意如不想产生费用要勾选免费选项。
4. 在[资源列表](https://cloud.ibm.com/resources)中，选择刚刚创建的数据库。
5. 在“管理 - Overview”中的 External Endpoint (preferred) 即为数据库的访问链接。
6. 在服务凭证中新建凭证，角色为管理员，新建后点下拉箭头看详细信息，其中有一项apikey。
7. 回到扩展的仓库管理页，新建或修改一个仓库，勾选使用数据库，并填上步骤5、6中获取到的链接和apikey，点确定。
8. 在仓库管理页点击同步仓库按钮，会初始化数据库并将现有配置同步到数据库，待同步完成后即可正常使用。

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
