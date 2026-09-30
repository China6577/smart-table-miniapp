# ---------- 构建阶段：安装依赖并编译 ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- 运行阶段：仅携带生产依赖与编译产物 ----------
FROM node:22-alpine
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY public ./public
EXPOSE 3000
CMD ["node", "dist/main.js"]
