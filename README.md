# SaltPlayer

一个基于 Node.js 的网页音乐播放器，支持本地音乐播放和网易云音乐在线播放。

> GitHub: https://github.com/kkw114/SaltPlayer

## 功能特性

### 播放功能
- 支持 MP3、FLAC、WAV、OGG、AAC、M4A、WMA、OPUS、WEBM 格式
- 播放/暂停、上一首/下一首、进度拖拽
- 倍速播放（0.5x - 2x）
- 音量控制（悬浮音量条）
- 歌词显示（LRC 格式，支持翻译）

### 音乐来源
- **默认**：服务器本地 `music/` 目录
- **网易云**：在线搜索、每日推荐、个人歌单
- **WebDAV**：远程音乐服务器
- **本地**：浏览器本地文件夹

### 网易云功能
- 扫码/手机号登录
- 搜索歌曲/歌单/歌手
- 每日推荐
- 个人歌单浏览
- VIP/SVIP 标识
- 歌词同步显示（含翻译）
- 音质选择（128/192/320kbps/无损）

### 界面特性
- 沉浸主题色（鲜艳/柔和/偏色）
- 背景效果（模糊/旋转/渐变/动态/纯色）
- 封面旋转动画
- 歌词效果（淡出/缩放/模糊）
- 暗色主题
- 移动端适配

### 快捷键
| 按键 | 功能 |
|------|------|
| Space | 播放/暂停 |
| Ctrl + ←/→ | 上/下一首 |
| ←/→ | 前进/后退 5 秒 |
| ↑/↓ | 音量 ±10% |
| M | 静音 |
| X/C | 减速/加速 |
| B | 回到开头 |
| 0-9 | 跳转到 0%-90% |

## 安装运行

### 本地运行
```bash
# 安装依赖
npm install

# 启动服务
node server.js

# 或使用启动脚本
start.bat
```

### Docker 部署
```bash
# 拉取镜像
docker pull ghcr.io/kkw114/saltplayer:latest

# 启动
docker-compose up -d
```

### 从源码构建
```bash
git clone https://github.com/kkw114/SaltPlayer.git
cd SaltPlayer
docker-compose up -d
```

### 环境变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3000 | 服务端口 |
| MUSIC_DIR | ./music | 音乐文件目录 |

## 项目结构
```
SaltLink/
├── index.html          # 主页面
├── server.js           # Express 服务器
├── package.json        # 依赖配置
├── css/
│   └── styles.css      # 样式文件
├── js/
│   ├── app.js          # 主应用逻辑
│   ├── audio-engine.js # 音频引擎 (Howler.js)
│   ├── lyrics.js       # 歌词解析
│   ├── playlist.js     # 播放列表管理
│   ├── ui.js           # UI 渲染
│   ├── settings.js     # 设置管理
│   ├── metadata.js     # 元数据读取
│   ├── color-utils.js  # 颜色工具
│   ├── netease-api.js  # 网易云 API
│   └── netease-ui.js   # 网易云 UI
├── fonts/              # 自定义字体
├── music/              # 音乐文件目录
├── Dockerfile          # Docker 构建
└── docker-compose.yml  # Docker Compose
```

## 配置存储

| 配置项 | 存储位置 |
|--------|----------|
| 界面设置 | 浏览器 localStorage (rnp-settings) |
| 网易云登录态 | 浏览器 localStorage (netease-cookie) |
| 音乐目录/端口 | 环境变量或 .env 文件 |

## 鸣谢
Refined Now Playing（一个美化网易云音乐播放界面的 BetterNCM 插件）：https://github.com/solstice23/refined-now-playing-netease

YesPlayMusic（高颜值的第三方网易云播放器）：https://github.com/qier222/YesPlayMusic


## 许可证

MIT License
