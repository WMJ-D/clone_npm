const CodingEditPath = 'D:\\Trae CN\\Trae CN.exe'
const configList = [
    // 示例1：自定义单个项目存放路径（Windows格式）
    //10.7.6.101000 组件库
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-core-v3.git', //git地址
    //     branch: '10.7.6.101000', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库\\10.7.6.101000', // 自定义存放目录
    //     codePath: '\\webcomponents-core-v3\\mapgis-gm-webcomponents-core', //项目代码路径savePath下的路径，依赖存放位置
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-common-v3.git', //git地址
    //     branch: '10.7.6.101000', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库\\10.7.6.101000', // 自定义存放目录
    //     codePath: '\\webcomponents-common-v3\\mapgis-gm-webcomponents-common', //项目代码路径savePath下的路径，依赖存放位置
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-base-v3.git', //git地址
    //     branch: '10.7.6.101000', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库\\10.7.6.101000', // 自定义存放目录
    //     codePath: '\\webcomponents-base-v3\\mapgis-gm-webcomponents-base', //项目代码路径savePath下的路径，依赖存放位置
    // },
    //开发版
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-core-v3.git', //git地址
    //     branch: 'develop', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库', // 自定义存放目录
    //     codePath: '\\webcomponents-core-v3\\mapgis-gm-webcomponents-core', //项目代码路径savePath下的路径，依赖存放位置
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-common-v3.git', //git地址
    //     branch: 'develop', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库', // 自定义存放目录
    //     codePath: '\\webcomponents-common-v3\\mapgis-gm-webcomponents-common', //项目代码路径savePath下的路径，依赖存放位置
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/Domain/webdir_v3/webcomponents-base-v3.git', //git地址
    //     branch: 'develop', //分支
    //     savePath: 'D:\\桌面\\中地\\代码\\组件库', // 自定义存放目录
    //     codePath: '\\webcomponents-base-v3\\mapgis-gm-webcomponents-base', //项目代码路径savePath下的路径，依赖存放位置
    // },

    //泰安市地质信息共享服务平台(三期)
    // {
    //   gitUrl: 'http://192.168.182.252/GMProjects/taiangeoshareserviceplat/taiangssplatportal.git',
    //   branch: 'master',
    //   savePath: 'D:\\桌面\\中地\\代码\\泰安市地质信息共享服务平台(三期)'
    // },
    // {
    //   gitUrl: 'http://192.168.182.252/GMProjects/taiangeoshareserviceplat/taiangssplatgeodata.git',
    //   branch: 'master',
    //   savePath: 'D:\\桌面\\中地\\代码\\泰安市地质信息共享服务平台(三期)'
    // },
    //浙江省城市地址平台
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/zjsugplat/zhejiangshengugdigitalplat.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\浙江省城市地址平台'
    // },
    //国家重大专项项目-地应力公共服务平台-一张图
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/isps-platform/isps-platformonemap.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\国家重大专项项目-地应力公共服务平台',
    //     codePath: '\\isps-platformonemap\\webapp',
    // },
    //国家重大专项项目-地应力公共服务平台-数据管理系统
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/isps-platform/isps-platformdms.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\国家重大专项项目-地应力公共服务平台',
    //     codePath: '\\isps-platformdms\\webapp',
    // },
    //武汉测绘院地质大数据平台
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/whchygeobigdataplat/whchygeobigdataplatdms.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\武汉测绘院地质大数据平台',
    //     codePath: '\\whchygeobigdataplatdms\\webapp',
    // },
    //山东黄金地勘-多源大数据管理分析系统
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/kckcdigitalplat/kckcdigitalplatonemap.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\山东黄金地勘\\多源大数据管理分析系统',
    //     codePath: '\\kckcdigitalplatonemap\\webapp',
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/KCKCDigitalPlat/kckcdigitalplatbigscreen.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\山东黄金地勘\\鹰眼智展大屏',
    //     codePath: '\\kckcdigitalplatbigscreen\\webapp',
    // },
    // // //山东黄金地勘-野外采集后台管理
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/kckcdigitalplat/kckcdigitalplatgeosurvey.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\山东黄金地勘\\野外采集后台管理',
    //     codePath: '\\kckcdigitalplatgeosurvey\\webapp',
    // },

    // // // //山东黄金地勘-数据管理系统
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/kckcdigitalplat/kckcdigitalplatdms.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\山东黄金地勘\\web数管',
    //     codePath: '\\kckcdigitalplatdms\\webapp',
    // },
    //新疆
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/xjdzydataplat/xjdzydataplatportal.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\新疆地质院地质数据管理与展示系统',
    //     codePath: '\\xjdzydataplatportal\\webapp',
    // },
    //上海地下空间
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/shanghaiundergroundspace/shanghai3dscene.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\上海地下空间',
    //     codePath: '\\shanghai3dscene\\webapp',
    // },
    // {
    //     gitUrl: 'http://192.168.182.252/GMProjects/shanghaiundergroundspace/underspaceonemap.git',
    //     branch: 'master',
    //     savePath: 'D:\\桌面\\中地\\代码\\上海地下空间1',
    //     codePath: '\\underspaceonemap\\webapp',
    // }

]

module.exports = {
    configList,
    CodingEditPath
}