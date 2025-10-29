# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

JoyFlix 是一个基于 Next.js 14 的影视聚合播放平台，支持多源API集成、用户管理、播放记录同步等功能。项目完全重构了 MoonTV，包含桌面端和移动端适配。

## 常用命令

```bash
# 开发环境（需要先生成运行时配置和清单文件）
pnpm gen:runtime && pnpm gen:manifest && next dev -H 0.0.0.0

# 生产构建
pnpm gen:runtime && pnpm gen:manifest && next build

# 运行生产版本
next start

# 代码检查和格式化
pnpm lint              # 基础 lint 检查
pnpm lint:fix          # 修复并格式化
pnpm lint:strict       # 严格模式（max-warnings=0）
pnpm format            # Prettier 格式化
pnpm format:check      # 检查格式

# 类型检查
pnpm typecheck         # TypeScript 类型检查

# 测试
pnpm test              # 运行 Jest 测试
pnpm test:watch        # 监视模式运行测试

# 生成配置文件
pnpm gen:runtime       # 从 config.json 生成运行时配置
pnpm gen:manifest      # 生成 PWA manifest
```

## 核心架构

### 技术栈
- **前端框架**: Next.js 14 (App Router) + TypeScript 4
- **样式**: TailwindCSS 3 + Framer Motion
- **状态管理**: React Context + 本地存储/Redis
- **视频播放**: ArtPlayer + HLS.js + VidStack
- **UI 组件**: Headless UI + Heroicons + Lucide React
- **包管理器**: pnpm

### 项目结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由（搜索、播放、用户管理等）
│   │   ├── admin/         # 管理后台 API
│   │   ├── douban/        # 豆瓣 API 集成
│   │   ├── search/        # 搜索相关 API
│   │   └── *.ts           # 其他 API 端点
│   ├── admin/             # 管理后台页面
│   ├── *.tsx              # 主要页面（首页、搜索、播放等）
│   └── layout.tsx         # 根布局和主题配置
├── components/             # React 组件
│   ├── ui/                # 基础 UI 组件
│   ├── player/            # 播放器相关组件
│   └── *.tsx              # 业务组件
├── lib/                   # 核心库和工具函数
│   ├── config.ts          # 配置管理（重要：处理多环境配置）
│   ├── db.ts              # 数据库抽象层
│   ├── auth.ts            # 认证逻辑
│   ├── douban.ts          # 豆瓣 API 集成
│   ├── *.db.ts            # 各种存储后端实现
│   └── types.ts           # 类型定义
├── styles/                # 全局样式
└── scripts/               # 构建脚本
    ├── convert-config.js   # 配置转换脚本
    └── generate-manifest.js # PWA manifest 生成
```

### 配置系统
项目使用动态配置系统：
- `config.json` - 主配置文件（API站点、自定义分类等）
- 环境变量 - 存储类型、代理设置等
- 运行时配置 - 通过 `pnpm gen:runtime` 生成
- 支持多种存储方式：localStorage、原生 Redis、Upstash Redis

### API 架构
- 遵循苹果 CMS V10 API 格式
- 支持多源聚合搜索（25+ 视频源）
- 集成豆瓣 API 用于元数据获取
- 图片代理系统处理跨域问题
- 流式搜索提高响应速度

### 存储层抽象
- `src/lib/db.ts` - 统一存储接口
- `src/lib/redis.db.ts` - Redis 实现
- `src/lib/upstash.db.ts` - Upstash Redis 实现
- 支持多账户数据隔离
- 跨设备同步（非 localstorage 模式）

## 重要特性

### 播放器集成
- ArtPlayer 作为主要播放器
- HLS.js 支持流媒体播放
- VidStack 作为备选播放器
- 广告过滤和优选路由机制
- 支持跳过片头片尾配置

### 响应式设计
- 桌面端和移动端专门优化
- Tablet 专门的侧边栏和交互
- 深色/浅色主题切换
- PWA 支持

### 搜索和推荐
- 多源聚合搜索，支持流式响应
- 热门推荐功能
- 搜索历史记录
- 自定义分类支持

### 管理功能
- 完整的管理后台 (`/admin`)
- 用户权限管理
- API 源管理和测试
- 站点配置管理

## 开发注意事项

### 配置文件修改
修改 `config.json` 后需要运行：
```bash
pnpm gen:runtime
```

### 环境变量
关键环境变量：
- `NEXT_PUBLIC_STORAGE_TYPE` - 存储类型（localstorage/redis/upstash）
- `USERNAME/PASSWORD` - 管理员账号（非 localstorage 模式必需）
- `NEXT_PUBLIC_DOUBAN_PROXY_TYPE` - 豆瓣代理类型
- `DOCKEER_ENV` - Docker 环境标识

### 数据库操作
- 使用存储抽象层 `src/lib/db.ts`
- 支持多种后端：localStorage、原生 Redis、Upstash Redis
- 管理后台在 `/admin` 路径
- 所有数据库操作都要通过 `DbManager` 类

### 新增功能开发
- API 路由放在 `src/app/api/` 下
- 组件放在 `src/components/` 下
- 工具函数放在 `src/lib/` 下
- 遵循 TypeScript 严格模式
- 使用 pnpm 作为包管理器

### 播放器开发
- 主要播放器：ArtPlayer (`src/components/player/`)
- 备选播放器：VidStack
- 流媒体支持：HLS.js
- 配置文件位置：`src/lib/config.ts`

### 搜索和API开发
- 苹果CMS V10 API格式
- 支持多源聚合
- 豆瓣API集成：`src/lib/douban.ts`
- 流式搜索：`src/app/api/searchstream/route.ts`

### 部署相关
项目支持多种部署方式：
- Vercel（推荐）
- Netlify
- Docker
- 爪云

部署前确保：
1. 设置必要的环境变量
2. 配置存储后端（Redis/Upstash）
3. 运行完整构建测试
4. 检查API源可用性

### 构建脚本
- `scripts/convert-config.js` - 将config.json转换为运行时配置
- `scripts/generate-manifest.js` - 生成PWA manifest文件