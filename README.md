# NeuroScope

NeuroScope 是一个中文神经网络拓扑学习工作台。一个 Tensor 元素对应一个球体，点击球体可以查看它的编号、多维坐标，以及相邻层中和它有直接连接的节点。连接只通过颜色表达，画布不绘制神经元之间的连线。

![Layer 02 的神经元 #5 在 Layer 03 的四个下游节点变蓝](docs/topology.jpg)

## 先试一次

1. 初始显示 Layer 03 的 27 个白色球体。点击左侧 **Layer 02**，观察 `[4, 4]` 矩阵。
2. 点击第二行第二个球。它会变绿，右侧显示 **Neuron #5** 和索引 **[1, 1]**。
3. 点击 **上一层**。Layer 01 的 `#0、#1、#3` 变蓝，其余两个保持白色。
4. 直接点击 **下一层**。画布切换到 Layer 03，只有 `#8、#9、#10、#11` 变蓝。右侧仍显示 Layer 02 的 #5。点击 **返回所选层** 可以再次看到绿色球体。

| 操作 | 效果 |
| --- | --- |
| 拖动 / 滚轮 / 触控板双指缩放 | 绕当前目标旋转、改变观察距离 |
| 双击球体 | 选中该球，并将观察中心对准它 |
| 上一层 / 下一层 | 相对于保留的所选神经元查询上游或下游。到达首尾层时禁用越界方向 |
| 点击另一个球或关联编号 | 改选为正在显示的层中的新节点，可继续沿它的上下游探索 |
| 重置视角 / 重置选择 | 分别恢复整层取景、清除选中及蓝色高亮 |
| 编号 / 按编号选择 | 切换编号标签，或按扁平编号选中内部和被遮挡的节点。多于 80 个节点时仅显示所选编号 |
| 调整当前层 Shape | 修改观察层的形状，重建模拟连接并清除旧选择。刷新恢复默认网络 |

## Ubuntu 部署

默认沿用服务器已有的宿主机 Nginx。浏览器访问 `http://服务器公网IP:16010`，宿主机将请求转发到 `127.0.0.1:3010`。Docker Compose 管理前端静态服务、FastAPI、内部 Nginx 网关。只有网关映射到宿主机。

### 1. 准备环境

以 root 登录 Ubuntu。检查 `git --version`、`docker compose version`、`nginx -v`。若宿主机尚无 Git 或 Nginx，可运行 `apt update && apt install -y git nginx`。Docker 需要 Engine 和 Compose v2 插件。新机器可按官方 Ubuntu APT 仓库流程安装，然后启动服务。[Docker Engine 安装说明](https://docs.docker.com/engine/install/ubuntu/)

```bash
systemctl enable --now docker
mkdir -p /opt
git clone https://github.com/LIKE9426334946/NeuroScope.git /opt/NeuroScope
cd /opt/NeuroScope
cp .env.example .env
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps
curl -fsS http://127.0.0.1:3010/api/health
```

健康接口返回 `{"status":"ok","service":"NeuroScope"}`。

### 2. 启用公网入口

```bash
cd /opt/NeuroScope
install -m 0644 deploy/host-nginx.conf /etc/nginx/sites-available/NeuroScope
ln -sfn /etc/nginx/sites-available/NeuroScope /etc/nginx/sites-enabled/NeuroScope
nginx -t && systemctl enable --now nginx && systemctl reload nginx
curl -fsS http://127.0.0.1:16010/api/health
```

浏览器打开 **http://服务器公网IP:16010**。如果本机健康检查成功而外部无法打开，在云安全组或服务器防火墙中放行入站 TCP `16010`。后端 `8000` 和前端 `8080` 仅在 Compose 网络内使用。

若服务器由 Docker 独占入口，可在首次启动前将 `.env` 的 `BIND_IP` 设为 `0.0.0.0`、`BIND_PORT` 设为 `16010`。此时由容器内 Nginx 直接接收公网请求，跳过宿主机 Nginx 配置步骤。一个端口只需启用一种入口。

### 3. 更新和查看日志

```bash
cd /opt/NeuroScope
git pull --ff-only origin main
docker compose up -d --build --wait
docker compose logs --tail 80 nginx backend frontend
```

`docker compose down` 停止服务。镜像内包含全部前端资产，浏览器无需下载第三方字体、模型或脚本。

## 数据与坐标

默认层为 `[5]`、`[4, 4]`、`[3, 3, 3]`，共 48 个神经元。每层独立渲染。神经元 ID 由层编号与从 0 开始的扁平编号共同确定。

| Tensor | 空间布局 |
| --- | --- |
| `[W]` | 从左到右的一排球 |
| `[H, W]` | 按行、列排列，行号向下递增 |
| `[D, H, W]` | 沿深度放置 D 张 H 行 W 列的网格 |

最右维变化最快。`[3, 4, 5]` 生成 60 个球，编号 47 对应 `[2, 1, 2]`。支持 1–3 个维度，每一维必须是 1–30 的整数。最大单层 `[30, 30, 30]` 生成 27,000 个球。

FastAPI 通过 `GET /api/network` 提供默认层定义。前端为每对相邻层生成可重复的稀疏模拟连接，每个目标节点最多取三个不同来源。每条记录有 `source_layer`、`source_neuron_index`、`target_layer`、`target_neuron_index` 四个字段。上下游索引从同一份记录建立，切换方向只查询索引。模拟连接仅用于学习，未加载 PyTorch 模型。API 暂时不可用时，页面会标明“内置模拟网络”，使用随包提供的相同默认层定义。

## 开发与验证

前端使用 React、TypeScript、Vite、Three.js、React Three Fiber、drei、Zustand 和 Tailwind CSS。WebGL2 可用时采用实例化球体渲染，缺少 WebGL2 时用同一套坐标、透视相机、轨道控制和颜色规则投影到 Canvas。两个渲染路径都支持拾取、旋转、缩放和聚焦。

本地开发使用 Node.js 24、npm 和 Python 3.12。在仓库根目录打开两个终端。

```bash
# 终端一
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```bash
# 终端二
npm ci
npm test
npm run build
npm run dev
```

打开 Vite 输出的本地地址，开发服务器将 `/api/` 转发到 FastAPI。`/api/docs` 可查看接口文档。

| 路径 | 职责 |
| --- | --- |
| `shared/network.json`、`src/network/` | 默认层定义、配置加载 |
| `src/tensor/` | Shape 校验、扁平编号与多维索引转换、空间坐标 |
| `src/connections/`、`src/stores/` | 生成连接记录、双向索引、当前选择与观察方向 |
| `src/neuron/`、`src/scenes/` | 节点颜色策略、拾取、相机、渲染 |
| `src/components/` | 层列表、属性检查器和形状编辑器 |
| `backend/`、`deploy/` | FastAPI、容器和宿主机的 Nginx 配置 |
| `tests/` | 坐标、边界、颜色、状态切换和 WebGL 浏览器回归 |

GitHub Actions 的 Ubuntu 验证任务会启动 Compose 三个服务，并在 Chromium 中检查真实 WebGL 画布、球体点击、蓝色像素、方向切换和双击聚焦。
