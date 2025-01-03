# Mariner - Docker 管理工具

Mariner 是一个跨平台的 Docker 管理工具，使用 Electron + Vue 3 构建。它提供了直观的图形界面来管理 Docker 容器、镜像和网络。

## 特性

1. 多平台兼容
   - 支持 Windows、macOS、Linux
   - 统一的安装与更新机制

2. 多宿主机容器管理
   - 支持多种连接方式（SSH、TLS/SSL）
   - 主机状态监控（CPU、内存、网络等）

3. 容器生命周期管理
   - 可视化容器列表
   - 容器操作（启动、停止、重启等）
   - 资源监控和日志查看

4. 标记与记录
   - 容器标签和备注
   - 快速搜索和过滤
   - 批量操作支持

5. 镜像管理
   - 镜像列表和版本管理
   - 收藏常用镜像
   - 自动清理功能

6. 远程终端
   - 集成 SSH 终端
   - 容器内部 Shell 访问
   - 多会话支持

## 开发

### 环境要求

- Node.js 18+
- npm 9+
- Docker

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 许可证

MIT
