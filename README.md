# 🧧 新春接红包游戏

一个使用 React 开发的春节主题休闲小游戏，适合亲朋好友一起玩！

## 🎮 游戏玩法

- 移动鼠标控制篮子接住掉落的红包
- 💰 红包 +10分
- 💣 炸弹 -5分
- ⏰ 60秒限时挑战

## 🚀 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📦 部署到 GitHub Pages

1. 在 GitHub 创建一个新仓库（例如：red-envelope-game）

2. 推送代码到 GitHub：
```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/red-envelope-game.git
git push -u origin main
```

3. 部署到 GitHub Pages：
```bash
npm install
npm run deploy
```

4. 在 GitHub 仓库设置中：
   - 进入 Settings > Pages
   - Source 选择 `gh-pages` 分支
   - 保存后即可通过 `https://你的用户名.github.io/red-envelope-game/` 访问

5. 绑定自定义域名（可选）：
   - 在 Settings > Pages > Custom domain 中输入你的域名
   - 在你的域名 DNS 设置中添加 CNAME 记录指向 `你的用户名.github.io`

## 🎊 祝你新年快乐！
