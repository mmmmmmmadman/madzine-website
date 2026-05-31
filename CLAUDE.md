# MADZINE Website

madzine.work 官方網站。品牌 MADZINE（本名鐘柏勳 / Pohsun Chung）。

## 核心事實

- **純靜態網站**：HTML + CSS + JS，無框架、無建置步驟、無 npm
- **部署**：push 到 `main` → GitHub Actions 自動部署至 GitHub Pages
- **域名**：`madzine.work`（CNAME 在 repo 根目錄）
- **Repo**：https://github.com/mmmmmmmadman/madzine-website
- **三語**：zh-TW / en / ja，翻譯集中在 `js/i18n.js`
- **設計 token**：顏色、字體、間距集中在 `css/tokens.css`，禁止散落硬編碼
- **預設字體**：Barlow Condensed Light（拉丁）+ Noto Sans JP Light（CJK）
- **品牌色**：珊瑚粉（coral pink, HSB H=12）

## 完整開發指南

架構概覽、完整檔案結構、新增作品步驟、三語維護方式見：

@DEVLOG.md

## 規則

- 改版面 / 配色 / 字體前，先讀 `css/tokens.css` 確認既有 token，不要新增重複定義
- 新增作品依 DEVLOG 的「新增作品步驟」執行，三語同步更新 `js/i18n.js`
- 部署後瀏覽器未更新時 `Cmd + Shift + R` 強制重新整理
