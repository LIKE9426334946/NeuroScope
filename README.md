# NeuroScope

NeuroScope 是一个中文神经网络拓扑学习工作台。一个 Tensor 元素对应一个球体，点击球体可以查看它的编号、多维坐标，以及相邻层中和它有直接连接的节点。连接只通过颜色表达，画布不绘制神经元之间的连线。

![管理页中的输入依赖窗口](docs/topology.jpg)

## 首页与管理页

在服务器上打开 `http://服务器公网IP:16010/` 展示，另开 `http://服务器公网IP:16010/admin` 编辑。管理页保留原来的三栏工作台。在管理页选中节点后切换上一层或下一层，首页会同时展示源层和目标层。所选神经元为绿色，当前方向的关联神经元为蓝色，其他节点为白色。

| 首页操作 | 效果 |
| --- | --- |
| 点击整层视图里的球体 | 把这个神经元单独固定在画布上，再点击其他层可以继续添加 |
| 右上角「选择神经元」 | 选择层并输入一个或多个编号，用逗号分隔。也可以移除固定项、选择要同时显示的整层视图 |
| 拖动层标题或单独的球体 | 移动该项。拖动整层视图内部可以旋转张量 |
| 滚轮 / 拖动右下角 | 放大或缩小当前项。单独的球体也支持双击缩放，聚焦移动区域后可用方向键移动、加减键缩放 |
| 右上角整理图标 | 将各项恢复到自动排列的位置与大小 |

在管理页的节点详情中点击「固定到首页」，可以为展示挑选多个不同层的神经元。固定名单、计算图、选中节点和观察方向由 Node.js 保存在 `data/presentation.json`，通过服务器推送到同一站点的展示页，重新打开或服务重启后会恢复。Tensor 改变 Shape 或被移除时，其固定项会清除。画布位置、缩放和手动显示的图层保存在展示端浏览器中，各设备可自行排版。

## 在管理页试一次

默认输入层的 Shape 为 `[3, 5, 5]`。经过输出通道数 8、卷积核 3×3、步长 1、填充 0 的 Conv2D 后，第二层自动得到 `[8, 3, 3]`。

1. 在 Layer 01 的“按编号选择”中输入 **12**，选中 `Input[0, 2, 2]`。点击 **下一层**。每个输出通道的九个卷积窗口都覆盖这个中心点，所以 72 个输出球全部变蓝。
2. 在 Layer 02 选中 **#4**，即 `Output[0, 1, 1]`。点击 **上一层**。每个输入通道只有第 1–3 行、第 1–3 列变蓝，共 27 个球。行列编号从 0 开始。
3. 点击 **添加 Conv2D**，在末尾继续添加运算。输入通道来自上一层，各项参数会实时更新输出 Shape 预览。点击 **生成输出层** 后可以从中间层向前、向后查询，详情栏始终显示所选节点的编号与两个方向的数量。

| 操作 | 效果 |
| --- | --- |
| 拖动 / 滚轮 / 触控板 | 旋转和缩放场景 |
| 单击 / 双击球体 | 选中神经元，或选中并聚焦 |
| 上一层 / 下一层 / 返回所选层 | 以原来的选择为起点查看直接依赖，再返回绿色选中点 |
| 编号 / 按编号选择 | 显示球体编号，或直接选择被遮挡的节点。超过 80 个节点时只标注当前选择 |
| 调整输入 Shape | 更改第一层并重新推导整条链。若某一步无效，错误会指明层号，原图和选择得到保留 |
| 添加 Conv2D / 移除末尾运算 | 从最后一层追加或撤回一步。移除全部运算后可以观察独立的一维、二维或三维输入 |
| 重置视角 / 重置选择 | 恢复整层取景，或清除选择和高亮 |

首次启动从服务器预设建立计算图，以后的访问会恢复最近一次已同步的工作台状态。

## Ubuntu 部署

以 root 登录 Ubuntu。项目安装在 `/opt/NeuroScope`。Nginx 监听公网 `16010`，将网页、静态文件和 `/api/` 请求统一转发到 `127.0.0.1:3010`。Node.js 提供网页和 API，systemd 负责开机启动与异常重启。

### 1. 准备环境

```bash
apt update
apt install -y git nginx curl ca-certificates
/usr/bin/node --version
npm --version
```

构建和测试需要 Node.js 22.13 或更高版本，推荐 Node.js 24。如果 `/usr/bin/node` 和 npm 已满足要求，直接进行下一步。新服务器可通过 NodeSource 安装 Node.js 24，其软件包提供 systemd 所用的 `/usr/bin/node`。[NodeSource 安装说明](https://github.com/nodesource/distributions)

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/neuroscope-node24-setup.sh
bash /tmp/neuroscope-node24-setup.sh
apt install -y nodejs
/usr/bin/node --version
npm --version
```

### 2. 获取代码并构建

首次安装执行下面的命令。

```bash
mkdir -p /opt
git clone --branch main https://github.com/LIKE9426334946/NeuroScope.git /opt/NeuroScope
cd /opt/NeuroScope
npm ci --include=dev
npm run build
```

如果 `/opt/NeuroScope` 已经是仓库，在该目录执行 `git pull --ff-only origin main`，然后执行同样的安装依赖和构建命令。若旧版正在运行，先按旧版 README 停止该项目，释放 `3010` 和 `16010`，再拉取代码。

### 3. 安装并启动 systemd 服务

```bash
cd /opt/NeuroScope
install -m 0644 deploy/NeuroScope.service /etc/systemd/system/NeuroScope.service
systemctl daemon-reload
systemctl enable --now NeuroScope.service
systemctl status NeuroScope.service --no-pager
curl --retry 5 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3010/api/health
```

健康接口返回 `{"status":"ok","service":"NeuroScope"}`。服务以 root 运行，生产入口为 `/usr/bin/node /opt/NeuroScope/backend/server.js`。

### 4. 启用 Nginx 公网入口

```bash
cd /opt/NeuroScope
install -m 0644 deploy/host-nginx.conf /etc/nginx/sites-available/NeuroScope
ln -sfn /etc/nginx/sites-available/NeuroScope /etc/nginx/sites-enabled/NeuroScope
nginx -t && systemctl enable --now nginx && systemctl reload nginx
curl --retry 5 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:16010/api/health
```

浏览器打开 **http://服务器公网IP:16010** 展示，进入 **http://服务器公网IP:16010/admin** 编辑。若本机 `16010` 健康检查成功但公网无法访问，请检查云安全组与服务器防火墙是否放行入站 TCP `16010`。内部端口 `3010` 仅供本机访问。

### 5. 后续更新和日志

```bash
cd /opt/NeuroScope
git pull --ff-only origin main
npm ci --include=dev && npm run build && systemctl restart NeuroScope.service
curl --retry 5 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:16010/api/health
journalctl -u NeuroScope.service -n 80 --no-pager
```

如果更新修改了服务文件或 Nginx 配置，先按第 3、4 步重新安装对应文件，并执行 `systemctl daemon-reload` 或通过 `nginx -t` 后重载 Nginx。

## 数据与坐标

每个维度的长度为 1–30 的整数。一维 `[N]` 显示一排球体，二维 `[H, W]` 显示矩形，三维 `[C, H, W]` 按通道堆叠空间网格。最右维变化最快，三维编号为 `(c * H + h) * W + w`。

### Conv2D 的结构性依赖

Conv2D 接收 `[C, H, W]`。界面自动从前一层读取 `in_channels`。如果在预设文件中显式指定该值，它必须等于前一层的通道数。对高、宽分别计算输出长度，其中 `L` 为输入长度，`K` 为卷积核大小，`S` 为步长，`P` 为每侧的零填充量，`D` 为膨胀率。

```text
L_out = floor((L + 2*P - D*(K-1) - 1) / S) + 1
```

卷积核、步长、零填充和膨胀率均可使用单个整数或高宽二元组。对输出位置 `o`，第 `k` 个核元素覆盖输入位置 `o*S - P + k*D`。仅实际落在输入中的坐标参与依赖。每个空间轴分别建立正向和反向索引。查询节点时，运算模块按通道分组组合行、列索引。绘图组件仅接收对应的扁平编号。

`groups` 必须同时整除输入和输出通道数。普通卷积连接全部输入通道。分组卷积仅访问同组通道。逐通道卷积使用 `groups = in_channels`，每个输入通道可以对应多个输出通道。高亮表达结构上参与运算的节点，不依赖具体数值或权重。[PyTorch Conv2d 运算定义](https://docs.pytorch.org/docs/stable/generated/torch.nn.Conv2d.html)

`shared/network.json` 保存 `input_shape` 和按顺序排列的 `operations`。Node.js 与浏览器共享同一套运算代码。接口 `GET /api/network` 还返回只读的 `layers` Shape 摘要。旧式预设只有手写层列表时，保留首层作为输入，其余层可在界面通过运算重建。API 不可用时显示“内置计算图”并使用随包预设。

## 开发与验证

前端使用 React、TypeScript、Vite、Three.js、React Three Fiber、drei、Zustand 和 Tailwind CSS。WebGL2 可用时采用实例化球体渲染，缺少 WebGL2 时用同一套坐标、透视相机、轨道控制和颜色规则投影到 Canvas。两个渲染路径都支持拾取、旋转、缩放和聚焦。

在仓库根目录安装依赖后，开两个终端本地开发。

```bash
# 终端一，启动 127.0.0.1:3010 的 Node.js 服务
npm ci
npm start
```

```bash
# 终端二，启动 Vite 开发服务器
npm run dev
```

在 Vite 输出的本地地址访问 `/` 或 `/admin`，`/api/` 将代理至 `127.0.0.1:3010`。执行 `npm test` 运行逻辑测试，`npm run build` 生成生产前端 `dist/`。构建后也可直接访问 `http://127.0.0.1:3010` 预览完整应用。`/api/docs` 提供接口说明和可以直接打开的 JSON 端点，`/api/openapi.json` 提供机器可读的接口定义。

| 路径 | 职责 |
| --- | --- |
| `shared/network.json`、`src/network/` | 预设、计算图推导和加载 |
| `src/tensor/` | Shape 校验、扁平编号与多维索引转换、空间坐标 |
| `src/operations/` | Conv2D 参数校验、输出推导、双向依赖查询 |
| `src/connections/`、`src/stores/` | 查询相邻运算、维护选择与观察方向 |
| `src/neuron/`、`src/scenes/` | 节点颜色策略、拾取、相机、渲染 |
| `src/presentation/` | 首页画布、神经元多选、拖动缩放和实时同步 |
| `src/components/` | 层列表、属性检查器、输入和运算配置 |
| `backend/`、`deploy/` | Node.js 服务、systemd 单元和 Nginx 站点配置 |
| `tests/` | 坐标、边界、颜色、状态切换和 WebGL 浏览器回归 |

GitHub Actions 的 Ubuntu 验证任务会使用仓库中的 systemd 单元启动 Node.js 服务，再通过 Nginx 的 16010 端口在 Chromium 中检查两个独立浏览器会话之间的展示同步、跨层多选、拖动缩放、刷新恢复，以及原有 WebGL 卷积编辑和高亮交互。浏览器回归使用独立测试实例。
