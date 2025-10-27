# JoyFlix Docker 多平台构建 Makefile

.PHONY: help build build-multi push-multi test clean

# 默认目标
help:
	@echo "JoyFlix Docker 多平台构建命令"
	@echo "make build-multi    - 构建 AMD64 和 ARM64 镜像"
	@echo "make push-multi    - 推送多平台镜像"
	@echo "make build-local    - 本地构建当前架构镜像"
	@echo "make test          - 测试构建的镜像"
	@echo "make clean         - 清理构建缓存"

# 构建多平台镜像
build-multi:
	@echo "🚀 开始构建多平台 Docker 镜像..."
	@echo "📦 目标平台: linux/amd64, linux/arm64"
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag joyflix:latest \
		--output type=docker .

# 推送多平台镜像到仓库
push-multi:
	@echo "📤 推送多平台镜像到 Docker Hub..."
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--tag joyflix:latest \
		--push .

# 本地构建当前架构
build-local:
	@echo "🔨 本地构建当前架构镜像..."
	docker build -t joyflix:latest .

# 测试构建的镜像
test:
	@echo "🧪 测试 Docker 镜像..."
	docker run --rm -p 3000:3000 joyflix:latest

# 清理构建缓存
clean:
	@echo "🧹 清理 Docker 构建缓存..."
	docker system prune -f

# 检查 Docker 环境
check-env:
	@echo "🔍 检查 Docker 多平台构建环境..."
	docker buildx version
	docker buildx ls