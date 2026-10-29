# 部署到自己的域名（Cloudflare Pages，不走 GitHub Pages）

这个项目是**纯静态站点**：`npm run build` 之后 `dist/` 目录就是完整的网站，
没有任何后端。所以"部署"= 把 `dist/` 传到静态托管 + 把域名解析过去。

选 Cloudflare Pages 的理由：免费、流量不限、自带 HTTPS 证书、全球 CDN、
支持直接用命令行上传（不需要把代码放到 GitHub）。

---

## 0. 先决条件

- Node.js 18+（本机已确认 v24）
- 一个 Cloudflare 账号（免费注册：https://dash.cloudflare.com/sign-up）
- 一个域名（还没买的话见第 3 节，**可以先跳过，用免费的 pages.dev 域名跑起来**）

---

## 1. 本地构建

```powershell
cd hanzi-link-game
npm install
npm run build
```

产物在 `dist/`，当前约 581 MB / 130 个文件。

> `vite.config.ts` 只在 GitHub Actions 环境里才把 `base` 改成 `/<仓库名>/`；
> 本地构建 `base` 就是 `/`，正好符合"自己的域名部署在根路径"的需求。
> 所以**不要**在构建时设置 `GITHUB_ACTIONS=true`。

---

## 2. 发布到 Cloudflare Pages

### 2.1 登录（只需一次）

```powershell
npx wrangler login
```

会弹出浏览器让你授权 Cloudflare 账号。

### 2.2 首次部署

```powershell
npx wrangler pages deploy dist --project-name hanzi-link-game --branch main
```

首次执行会让你创建项目，选 `Create a new project` 即可。成功后拿到一个免费域名：

```
https://hanzi-link-game.pages.dev
```

**这一步做完网站就已经能访问了**，可以先在手机上验收，再慢慢办域名。

### 2.3 以后每次更新

改完代码后重复：

```powershell
npm run build
npx wrangler pages deploy dist --project-name hanzi-link-game --branch main
```

wrangler 按文件内容哈希去重，第二次之后只上传变化的文件，很快。
（嫌麻烦可以把这两条写进 `package.json` 的 `scripts.deploy`。）

### 2.4 不想装 CLI 的替代方式

Cloudflare 后台 → Workers & Pages → Create → Pages → **Upload assets**，
把整个 `dist` 文件夹拖进去。不过 581 MB 用浏览器的拖拽容易中断，**推荐用 CLI**。

### 2.5 在 CI 里部署（可选）

在 Cloudflare 后台创建 API Token（权限 `Cloudflare Pages:Edit`），然后：

```powershell
$env:CLOUDFLARE_API_TOKEN = "<你的 token>"
$env:CLOUDFLARE_ACCOUNT_ID = "<你的 account id>"
npx wrangler pages deploy dist --project-name hanzi-link-game --branch main
```

---

## 3. 买一个域名

域名可以在任何注册商买，能自由解析即可：

| 注册商 | 特点 |
| --- | --- |
| **Cloudflare Registrar** | 按成本价卖，无溢价、无续费涨价；需先有 CF 账号并绑卡；不支持 `.cn` |
| **Porkbun / Namecheap** | 支持支付宝/PayPal 的选项多，`.com` 首年便宜 |
| **阿里云 / 腾讯云** | 国内付款方便，但**必须完成实名认证**（注意：实名 ≠ 备案） |

买完之后**不需要**备案，因为下面用的是 Cloudflare 的海外节点。

---

## 4. 绑定自己的域名

### 4.1 把域名的 DNS 交给 Cloudflare（推荐）

1. Cloudflare 后台 → **Add a site** → 输入域名 → 选 Free 计划。
2. Cloudflare 会给两个 NS，例如 `xxx.ns.cloudflare.com`。
3. 回到你的注册商后台，把域名的 **Nameservers 改成这两个**。
4. 等生效（几分钟到 24 小时），Cloudflare 后台状态变成 `Active`。

> 把 NS 托管给 Cloudflare 是必要的一步：Pages 的自定义域名要求域名在
> Cloudflare 上解析（根域名无法用普通 CNAME 指向 pages.dev）。

### 4.2 在 Pages 项目里加域名

1. Workers & Pages → 你的项目 → **Custom domains** → **Set up a custom domain**。
2. 输入 `hanzi-link-game.com`（或 `www.hanzi-link-game.com`）。
3. Cloudflare 会自动创建 `CNAME → hanzi-link-game.pages.dev`（代理开启），
   证书也会自动签发。等状态变成 `Active` 即可，通常几分钟。

### 4.3 关于根域名 vs www

- 想用 `hanzi-link-game.com` 直接访问：按 4.2 添加根域名。
- 想把 `www` 也指过来：再加一条 `www` 的自定义域名，或者用
  **Redirect Rules** 把 `www` 301 到根域名（反之亦可），避免两个地址都有内容。

---

## 5. 这个项目特有的注意事项

### 5.1 站点体积

`public/birthday/photos/` 原有 122 张 JPG，共约 577 MB，平均每张 **4.7 MB**，
最大的 11.4 MB。生日页虽然用了 `loading="lazy"`，但单张几 MB 在手机 4G 上
依然很慢，每次部署也要传五分钟。

**已用 `tools/compress_photos.py` 压过一轮**：长边 1600 px、quality 88、4:4:4，
总体积 **577 MB → 53.6 MB（9.3%）**，单张从 11.4 MB 降到约 950 KB，
整站部署包 581 MB → 58 MB。文件名保持不变，所以 `index.html` 无需改动。

脚本用法（用带 Pillow 的 Python 运行）：

```powershell
python tools/compress_photos.py --probe                      # 只看尺寸分布
python tools/compress_photos.py --dry-run --quality 88       # 试算，不写盘
python tools/compress_photos.py --max-side 1600 --quality 88 # 就地压缩
```

要点：

- 压缩前会 `exif_transpose`，把手机照片的旋转烤进像素，再剥掉 EXIF，
  否则竖图会变横。
- 只缩小不放大；已经小于 500 KB 且长边不超过 1600 的文件会跳过。
- 原图仍在 git 历史里，`git checkout -- public/birthday/photos` 可完整还原。

Cloudflare Pages 免费版的硬限制：**单文件 ≤ 25 MiB、单次部署 ≤ 20,000 个文件**。
当前最大单文件约 1 MB，余量充足。

### 5.2 路径

- 所有图片/音频都是相对路径（`./photos/...`、`./audio/...`），
  游戏内的生日入口用 `import.meta.env.BASE_URL` 拼接，
  所以在根域名、子路径、pages.dev 下都能正常工作。
- 没有前端路由（单页，不涉及 `history` 模式），**不需要**配 SPA fallback。

### 5.3 `_headers`

仓库里新增了 `public/_headers`，构建时会自动复制到 `dist/_headers`，
Cloudflare Pages 会读取它来设置缓存策略：

- `/assets/*`（带哈希的 JS/CSS）→ 强缓存一年
- 入口 HTML → 每次校验，发版后用户立刻拿到新版
- `/birthday/photos/*`、`/birthday/audio/*` → 缓存 30 天

### 5.4 中国大陆访问速度

Cloudflare 免费版的节点在境外，大陆访问有波动。如果主要用户在大陆：

- 想省事：先接受 Cloudflare（多数地区可用）。
- 追求速度：改用**国内云**（阿里云 OSS + CDN、腾讯云 COS + CDN、
  腾讯云 EdgeOne Pages），**但域名必须完成 ICP 备案**，否则会被阻断。
- 折中：主域名走国内 CDN（需备案），或者用国内外双线路由。

---

## 6. 验收清单

- [ ] `https://hanzi-link-game.pages.dev` 能正常玩
- [ ] 首页的"生日"入口能打开 `/birthday/index.html`，图片能加载
- [ ] 自定义域名状态为 Active，`https://你的域名` 证书正常
- [ ] 手机 4G 下首屏加载可接受（不行就压缩图片）
- [ ] 发版后强刷一次看到新版本（`_headers` 已处理缓存）
