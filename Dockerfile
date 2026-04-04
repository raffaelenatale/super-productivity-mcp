FROM node:20-alpine
WORKDIR /app
ENV MCP_HOST=0.0.0.0
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js", "start"]
