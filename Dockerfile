# syntax=docker/dockerfile:1
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

FROM dependencies AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=https://mangata.com.ar
ARG RELEASE_ID
ENV NEXT_TELEMETRY_DISABLED=1 \
    MANGATA_STANDALONE=1 \
    MANGATA_COMMERCE_MODE=local \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_DEPLOYMENT_ID=$RELEASE_ID \
    NODE_OPTIONS=--max-old-space-size=2048
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG RELEASE_ID
LABEL org.opencontainers.image.title="MANGATA" \
      org.opencontainers.image.revision=$RELEASE_ID
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    MANGATA_COMMERCE_MODE=local
RUN addgroup -S -g 1001 mangata && adduser -S -u 1001 -G mangata mangata
COPY --from=builder --chown=mangata:mangata /app/.next/standalone ./
COPY --from=builder --chown=mangata:mangata /app/.next/static ./.next/static
COPY --from=builder --chown=mangata:mangata /app/public ./public
RUN mkdir -p .next/cache && chown -R mangata:mangata .next/cache
USER mangata
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
