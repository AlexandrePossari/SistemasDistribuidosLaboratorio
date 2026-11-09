# syntax=docker/dockerfile:1

FROM node:26-alpine

WORKDIR /app

# Camada de dependencias: so e refeita quando o package.json/lock mudam
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Servidor do Vite acessivel de fora do container (porta publicada pelo compose).
# VITE_API_URL e lida na inicializacao e aponta para a API como o navegador a enxerga.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
