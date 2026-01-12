# ScholarMap 上线操作手册（GCP 单机版）

目标：按最简路线把 ScholarMap 发布到公网：`Docker 化 → 云服务器部署 → 域名绑定 → HTTPS（Let’s Encrypt） → 对外开放`。  
默认：**不使用负载均衡**、**单台 VM**、**前后端同域名**（`/api` 反代到后端）。

---

## 第 0 步：你需要准备的东西

- 一个域名：例如 `example.com`
- 一个 GCP Project（已开通计费）
- 本地已能跑通开发模式（你提供的启动命令如下）：
  - 后端：`uvicorn app.main:app --reload --port 8000`
  - 前端：`npm run dev -- --port 3000`
- 需要的环境变量（**只放服务器**，不要提交到 Git）：
  - 后端：`OPENAI_API_KEY`（以及可选的 `PUBMED_API_KEY`、`SEMANTIC_SCHOLAR_API_KEY`、`OPENALEX_MAILTO`）
  - 前端：`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

---

## 第 1 步：在 GCP 开启必要服务

在 GCP Console 里为你的 Project 启用：
- Compute Engine API
- Artifact Registry API（推荐，用于存放 Docker 镜像）
- Cloud DNS API（绑定域名用）

---

## 第 2 步：创建一个 Artifact Registry（Docker 仓库）

1) 打开 Artifact Registry → Create repository
- Format：Docker
- Location：选择一个 region（例如 `us-central1`）
- Repository name：例如 `scholarmap`

2) 本地登录并配置 Docker：
- `gcloud auth login`
- `gcloud auth configure-docker us-central1-docker.pkg.dev`

---

## 第 3 步：预留一个固定公网 IP（给 VM 用）

1) VPC network → IP addresses → Reserve static address  
2) Region 与后面 VM 保持一致  
3) 记下这个公网 IP（后面 DNS 的 A 记录要指向它）

---

## 第 4 步：创建一台 Compute Engine VM（Ubuntu）

Compute Engine → VM instances → Create instance：
- OS：Ubuntu 22.04 LTS
- 机型：`e2-medium`（先够用）
- 磁盘：建议 50GB（数据增长快就再大）
- Network：绑定第 3 步的 static IP
- 防火墙：允许 HTTP/HTTPS（至少要开 80/443）

创建后 SSH 登录到 VM。

---

## 第 5 步：在 VM 安装 Docker + Compose

在 VM 执行：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

（可选）免 sudo 使用 docker：

```bash
sudo usermod -aG docker $USER
```

然后重新登录 SSH。

---

## 第 6 步：Docker 化（准备镜像与 Compose）

你需要在仓库里准备（若还没有）：
- `backend/Dockerfile`
- `frontend/Dockerfile`
- （生产）`docker-compose.yml`（一般放 VM 上即可）

### 6.1 最简单的部署结构（建议）

- 对外只暴露 Nginx（80/443）
- 后端/前端只监听本机回环（`127.0.0.1`），不直接暴露公网
- 后端数据目录挂载到宿主机，避免容器重建丢数据

### 6.2 生产环境变量（不要提交到 Git）

建议在服务器放一个文件：`/opt/scholarmap/.env.prod`，内容类似：

```bash
# Backend
OPENAI_API_KEY=sk-...
PUBMED_API_KEY=
SEMANTIC_SCHOLAR_API_KEY=
OPENALEX_MAILTO=
SCHOLARMAP_DATA_DIR=/app/data

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://example.com
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk-...
```

---

## 第 7 步：构建并推送镜像到 Artifact Registry（在本地做）

> 重要：**镜像必须版本化**。不要长期只用 `:prod` 这种“浮动 tag”，否则一旦覆盖 push，会失去历史版本，无法可靠回滚。  
> 推荐：每次发布使用不可变 tag，例如 `prod-YYYYMMDD-<gitsha>`；（可选）再额外推一个 `:prod` 作为“最新指针”，但线上部署应**固定到版本 tag**。

在本地（仓库根目录）设置变量（替换为你的值）：

```bash
PROJECT_ID=你的GCP项目ID
REGION=us-central1
REPO=scholarmap
```

再设置本次发布版本号（示例）：

```bash
VERSION=prod-20251221-<gitsha>
```

构建并 push：

```bash
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:$VERSION ./backend
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:$VERSION ./frontend

docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:$VERSION
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:$VERSION
```

（可选）如果你还想保留 `:prod` 作为“最新”标签：

```bash
docker tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:$VERSION $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:prod
docker tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:$VERSION $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:prod
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:prod
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:prod
```

---

## 第 8 步：在 VM 上用 Docker Compose 拉起服务（先不加 HTTPS）

1) 在 VM 创建目录与数据目录（持久化）：

```bash
sudo mkdir -p /opt/scholarmap
sudo mkdir -p /var/lib/scholarmap/data
```

2) 在 VM 写 `/opt/scholarmap/docker-compose.yml`（把 `PROJECT_ID/REGION` 换成你的）：

```yaml
services:
  backend:
    image: us-central1-docker.pkg.dev/PROJECT_ID/scholarmap/backend:prod-20251221-<gitsha>
    env_file: .env.prod
    volumes:
      - /var/lib/scholarmap/data:/app/data
    ports:
      - "127.0.0.1:8000:8000"
    restart: unless-stopped

  frontend:
    image: us-central1-docker.pkg.dev/PROJECT_ID/scholarmap/frontend:prod-20251221-<gitsha>
    env_file: .env.prod
    ports:
      - "127.0.0.1:3000:3000"
    restart: unless-stopped
```

3) 把你的环境变量文件放到 `/opt/scholarmap/.env.prod`（见第 6 步）

4) 启动：

```bash
cd /opt/scholarmap
docker compose pull
docker compose up -d
```

5) 在 VM 上本地验证：

```bash
curl http://127.0.0.1:8000/healthz
curl -I http://127.0.0.1:3000
```

---

## 第 8.5 步：发布 & 回滚（版本化镜像）

### 发布（Deploy 新版本）

1) 本地按第 7 步构建并 push 一个新版本 tag（例如 `VERSION=prod-20251221-<gitsha>`）

2) 在 VM 上更新 `/opt/scholarmap/docker-compose.yml` 里的镜像 tag（backend/frontend 都改成新 `:$VERSION`）

3) 在 VM 执行发布：

```bash
cd /opt/scholarmap
docker compose pull
docker compose up -d
```

4) 发布后验证：

```bash
curl http://127.0.0.1:8000/healthz
curl -I http://127.0.0.1:3000
curl -I https://example.com
curl https://example.com/api/healthz
```

建议把“当前线上版本号”记录在：
- `/opt/scholarmap/docker-compose.yml`（镜像 tag 本身就是记录）
- 或额外写一个 `/opt/scholarmap/VERSION` 文件（人工记录也行）

### 回滚（Rollback 到旧版本）

回滚原则：**改回旧 tag + `up -d`**（数据卷不动，回滚只影响代码）。

1) 在 VM 上把 `/opt/scholarmap/docker-compose.yml` 的镜像 tag 改回上一个稳定版本（例如从 `prod-20251221-abc123` 改回 `prod-20251215-def456`）

2) 执行回滚：

```bash
cd /opt/scholarmap
docker compose pull
docker compose up -d
```

3) 回滚后验证：

```bash
curl https://example.com/api/healthz
```

---

## 第 9 步：Cloud DNS 绑定域名到 VM

1) Cloud DNS 创建 zone（例如 `example-com`）  
2) 按 Cloud DNS 提示，把你的域名 NS 指向该 zone（在域名注册商处设置）  
3) 在 Cloud DNS 添加 A 记录：
- `example.com` → 你的 VM static IP

等待解析生效后（几分钟～数小时），继续下一步。

---

## 第 10 步：配置 Nginx（HTTP 反代 /api 与前端）

在 VM 安装 nginx：

```bash
sudo apt-get install -y nginx
```

写配置 `/etc/nginx/sites-available/scholarmap`（把 `example.com` 改成你的域名）：

```nginx
server {
  listen 80;
  server_name example.com;

  location /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/scholarmap /etc/nginx/sites-enabled/scholarmap
sudo nginx -t
sudo systemctl reload nginx
```

此时访问 `http://example.com` 应该已可用（仍是 HTTP）。

---

## 第 11 步：Let’s Encrypt 上 HTTPS（Certbot）

安装 Certbot：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

申请证书并自动改 Nginx：

```bash
sudo certbot --nginx -d example.com
```

验证自动续期：

```bash
sudo certbot renew --dry-run
```

验证：
- `https://example.com`
- `https://example.com/api/healthz`

---

## 第 12 步：上线后最小检查清单

- GCP 防火墙：只开 `80/443`（`22` 建议限制到你的固定 IP）
- 数据持久化：确认 `/var/lib/scholarmap/data` 持续增长且容器重启后数据仍在
- 前端调用后端：确认 `NEXT_PUBLIC_API_BASE_URL=https://example.com` 已生效（前端需要重建镜像或重新启动容器后才会生效）

---

## 附录 A：本地开发模式启动命令（你当前使用的）

后端（开发模式）：

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

前端（开发模式）：

```bash
cd frontend
npm run dev -- --port 3000
```
