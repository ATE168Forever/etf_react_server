# 1. 建構階段：用 node 建置 react app
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package.json，安裝依賴
COPY package.json ./

RUN corepack enable && pnpm install

# 複製所有檔案
COPY . .

# Build react app
RUN pnpm run build

# 2. 生產環境: 用 nginx serve 靜態檔案
FROM nginx:alpine

# 複製 build 出來的檔案到 nginx 預設目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 如有自定義 nginx.conf 請取消下一行註解
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
