# GitHub Actions 多架构 Docker 构建流程

## 📋 功能特性

✅ **自动触发**
- 代码推送到 `main` 或 `feature` 分支时自动构建
- 支持手动触发（workflow_dispatch）
- 忽略文档和配置文件变更

🏗️ **多架构支持**
- **AMD64 (x86_64)**：适用于大多数云服务器和本地开发
- **ARM64**：适用于 ARM 架构服务器（如 Oracle Cloud ARM）

## 🔧 配置要求

### GitHub Secrets
需要在仓库设置中配置以下 secrets：

```
DOCKER_USERNAME: lkzyxn  # 你的 Docker Hub 用户名
DOCKER_PASSWORD: your_docker_password  # 你的 Docker Hub 密码或访问令牌
```

### 环境变量
- `REGISTRY`: docker.io
- `IMAGE_NAME`: lkzyxn/joyflix

## 📦 镜像标签策略

### Fixed Tags
- `latest-amd64`: 稳定的 AMD64 最新版本
- `latest-arm64`: 稳定的 ARM64 最新版本

### SHA Tags（用于可重现构建）
- `latest-amd64-{sha}`: 特定提交的 AMD64 版本
- `latest-arm64-{sha}`: 特定提交的 ARM64 版本

## 🎯 构建流程

1. **环境准备**
   - 使用 `ubuntu-latest` 运行器
   - 设置 QEMU 模拟器支持多架构

2. **Docker 构建配置**
   - 使用 `docker/setup-buildx-action@v3`
   - 配置 GitHub Container Registry 用于缓存优化

3. **并行构建**
   - AMD64 和 ARM64 同时构建
   - 使用层缓存加速构建过程

4. **Manifest 管理**
   - 创建多架构 manifest
   - 支持 `latest` 和 SHA 特定标签

## 🚀 部署优势

### 自动化
- 代码推送后自动构建多架构镜像
- 无需手动干预

### 兼容性
- 支持 AMD64 和 ARM64 服务器
- 自动选择合适架构的镜像

### 可重现性
- SHA 特定标签确保部署一致性
- 支持回滚到特定版本

## 📋 使用方法

### 自动构建
```bash
git push origin main  # 推送到 main 分支触发自动构建
```

### 手动触发
1. 访问 GitHub 仓库页面
2. 点击 "Actions" 标签
3. 选择 "Build and Push Multi-Architecture Docker Images"
4. 点击 "Run workflow"
5. 输入任意参数（可以留空）

## 🏗️ 镜像使用

### 拉取镜像
```bash
# 拉取 AMD64 版本
docker pull lkzyxn/joyflix:latest-amd64

# 拉取 ARM64 版本
docker pull lkzyxn/joyflix:latest-arm64

# Docker 会自动选择匹配的系统架构
```

### 运行容器
```bash
# Docker 会自动选择正确的架构
docker run -p 3000:3000 lkzyxn/joyflix:latest

# 手动指定架构
docker run --platform linux/amd64 -p 3000:3000 lkzyxn/joyflix:latest-amd64
docker run --platform linux/arm64 -p 3000:3000 lkzyxn/joyflix:latest-arm64
```

## 🔗 相关链接

- **Docker Hub**: https://hub.docker.com/r/lkzyxn/joyflix
- **GitHub Actions**: https://github.com/lkzyxn/joyflix/actions

## 📝 构建日志

每次构建都会在 GitHub Actions 中显示详细日志，包括：
- 构建进度
- 镜像大小
- 推送状态
- 多架构 manifest 创建结果

## 🐛 故障排除

### 构建失败
1. 检查 Docker Hub 认证信息是否正确
2. 确认分支权限设置正确
3. 查看构建日志中的错误信息

### 镜像拉取失败
1. 检查镜像是否成功推送到 Docker Hub
2. 验证标签名称是否正确
3. 检查网络连接

### 权限问题
1. 确认 GitHub Actions 权限设置
2. 检查 secrets 配置是否正确
3. 验证 Docker Hub 仓库访问权限

---

*最后更新: 2025-10-27*