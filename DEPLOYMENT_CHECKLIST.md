# 📋 Deployment Checklist

## Pre-Deployment

- [ ] All Docker files created
  - [x] `Dockerfile`
  - [x] `docker-compose.yml`
  - [x] `.dockerignore`
  - [x] `README.Docker.md`
- [ ] Code committed to Git
- [ ] Environment variables documented
- [ ] Database backup taken (if migrating)

---

## Local Testing

```bash
# 1. Test Docker build
docker-compose build

# 2. Start services
docker-compose up -d

# 3. Check logs
docker-compose logs -f backend

# 4. Test API
curl http://localhost:5000/

# 5. Stop services
docker-compose down
```

---

## Choose Deployment Platform

### ✅ Railway.app (Recommended)
**Best for: Quick deployment, managed database, always-on**

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Add PostgreSQL service
- [ ] Set environment variables
- [ ] Deploy
- [ ] Get URL: `https://your-app.railway.app`
- [ ] Test API endpoints
- [ ] Update mobile app with new URL

**Cost:** $5-10/month

---

### ✅ Render.com
**Best for: Free tier, easy deployment**

- [ ] Create Render account
- [ ] Create Web Service from Docker
- [ ] Add PostgreSQL database
- [ ] Set `DATABASE_URL`
- [ ] Deploy
- [ ] Get URL: `https://your-app.onrender.com`
- [ ] Test API endpoints
- [ ] Update mobile app with new URL

**Cost:** Free (with sleep) or $7/month

---

### ✅ DigitalOcean App Platform
**Best for: Reliable hosting, good support**

- [ ] Create DigitalOcean account
- [ ] Create App from GitHub
- [ ] Add Managed Database
- [ ] Configure environment
- [ ] Deploy
- [ ] Get URL: `https://your-app.ondigitalocean.app`
- [ ] Test API endpoints
- [ ] Update mobile app with new URL

**Cost:** $12/month

---

### ✅ Own VPS
**Best for: Full control, custom domain**

- [ ] Set up VPS (DigitalOcean, AWS, etc.)
- [ ] Install Docker & Docker Compose
- [ ] Clone repository
- [ ] Create `.env` file with secrets
- [ ] Run `docker-compose up -d`
- [ ] Configure Nginx/domain
- [ ] Set up SSL (Let's Encrypt)
- [ ] Get URL: `https://yourdomain.com`
- [ ] Test API endpoints
- [ ] Update mobile app with new URL

**Cost:** $5-12/month

---

## Post-Deployment

- [ ] API health check passes
- [ ] Database connection works
- [ ] Can create test reminder
- [ ] Push notifications send
- [ ] SMS messages send
- [ ] Cron jobs running (check at 6 AM Tunisia time)
- [ ] Notification scheduler running (every 60s)
- [ ] Voice message uploads work
- [ ] All endpoints tested

---

## Update Mobile App

After deployment, update this file:

```typescript
// MediCareApp/config/api.ts
export const API_CONFIG = {
  BASE_URL: 'https://YOUR-DEPLOYED-URL.com/api', // ← UPDATE THIS
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};
```

Then rebuild the mobile app:
```bash
cd MediCareApp
npm start
```

---

## Monitoring

- [ ] Set up error logging (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up database backups
- [ ] Configure alerts for downtime
- [ ] Monitor SMS/Push notification delivery rates

---

## Security

- [ ] Change default database password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Review exposed ports
- [ ] Set up firewall rules (if VPS)
- [ ] Regular dependency updates

---

## Troubleshooting

### Logs
```bash
# View backend logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f database

# View all logs
docker-compose logs -f
```

### Restart
```bash
# Restart backend only
docker-compose restart backend

# Restart all
docker-compose restart
```

### Rebuild
```bash
# After code changes
docker-compose up -d --build
```

### Database
```bash
# Connect to database
docker-compose exec database psql -U medicare_user -d medicare_db

# Run migrations manually
docker-compose exec backend npx prisma migrate deploy

# View database data
docker-compose exec database psql -U medicare_user -d medicare_db -c "SELECT * FROM users LIMIT 5;"
```

---

## Production URLs

| Platform | Example URL |
|----------|-------------|
| Railway | `https://medicare-production.up.railway.app` |
| Render | `https://medicare-backend.onrender.com` |
| DigitalOcean | `https://medicare-xxxxx.ondigitalocean.app` |
| Custom VPS | `https://api.yourdomain.com` |

---

## Support Links

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [DigitalOcean Docs](https://docs.digitalocean.com)
- [Docker Docs](https://docs.docker.com)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

## Quick Deploy Commands

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### Render
```bash
# Push to GitHub
git push

# Render auto-deploys from GitHub
```

### DigitalOcean
```bash
# Push to GitHub
git push

# Deploy via dashboard
```

### VPS
```bash
# SSH to server
ssh user@your-ip

# Pull latest code
cd medicare/mediCare_Back
git pull

# Rebuild and restart
docker-compose up -d --build
```

---

✅ **Checklist Complete!** Your app is ready for production! 🎉

