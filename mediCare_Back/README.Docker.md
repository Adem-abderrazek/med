# 🐳 Docker Deployment Guide

## Quick Start

### Local Development with Docker

```bash
# 1. Start all services (database + backend)
docker-compose up -d

# 2. View logs
docker-compose logs -f backend

# 3. Stop all services
docker-compose down

# 4. Stop and remove all data
docker-compose down -v
```

## Deployment Options

### Option 1: Railway.app (Recommended)

**Easiest deployment - Auto-detects Docker**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Docker configuration"
   git push
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select your repository
   - Railway auto-detects Dockerfile
   - Add PostgreSQL from marketplace
   - Set environment variable: `DATABASE_URL`
   - Deploy!

3. **Get your URL:**
   ```
   https://medicare-production.up.railway.app
   ```

4. **Update Mobile App:**
   ```typescript
   // MediCareApp/config/api.ts
   BASE_URL: 'https://medicare-production.up.railway.app/api'
   ```

**Cost:** ~$5-10/month

---

### Option 2: Render.com

**Free tier available**

1. Push to GitHub
2. Go to [render.com](https://render.com)
3. Create "Web Service" from Docker
4. Add PostgreSQL database
5. Set `DATABASE_URL` environment variable
6. Deploy!

**URL:** `https://medicare-backend.onrender.com`

**Cost:** Free tier (sleeps after inactivity) or $7/month

---

### Option 3: DigitalOcean App Platform

**Reliable and affordable**

1. Push to GitHub
2. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
3. Create app from GitHub
4. Select Dockerfile
5. Add managed PostgreSQL
6. Deploy!

**URL:** `https://medicare-xxxxx.ondigitalocean.app`

**Cost:** ~$12/month (app + database)

---

### Option 4: VPS (DigitalOcean Droplet, AWS EC2, etc.)

**Full control**

```bash
# 1. SSH to your server
ssh user@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 4. Clone repo
git clone https://github.com/yourusername/medicare.git
cd medicare/mediCare_Back

# 5. Create .env file
cp .env.docker .env
nano .env  # Edit with your secrets

# 6. Start services
docker-compose up -d

# 7. View logs
docker-compose logs -f

# 8. (Optional) Set up Nginx for domain
```

**URL:** `https://yourdomain.com` or `http://your-ip:5000`

**Cost:** $5-12/month

---

## Environment Variables

Set these on your deployment platform:

### Required:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
PORT=5000
```

### Optional (if your app uses them):
```env
JWT_SECRET=your_secret_key
```

---

## Database Migrations

Migrations run automatically on container start!

The Docker container runs:
```bash
npx prisma migrate deploy && node dist/index.js
```

---

## Health Checks

The container includes health checks:
- Endpoint: `http://localhost:5000/`
- Interval: Every 30 seconds
- Timeout: 10 seconds

---

## Troubleshooting

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f database
```

### Restart Services
```bash
docker-compose restart backend
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### Connect to Database
```bash
docker-compose exec database psql -U medicare_user -d medicare_db
```

### Reset Everything
```bash
docker-compose down -v
docker-compose up -d --build
```

---

## Production Checklist

Before deploying to production:

- [ ] Change database password in environment variables
- [ ] Set strong `JWT_SECRET`
- [ ] Configure CORS origins
- [ ] Set up SSL/HTTPS
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Test all API endpoints
- [ ] Test cron jobs (daily reminder generation)
- [ ] Test notification scheduler (runs every 60s)

---

## Your Final URLs

After deployment, update your mobile app:

```typescript
// MediCareApp/config/api.ts
export const API_CONFIG = {
  // Replace with your actual deployment URL
  BASE_URL: 'https://your-app.railway.app/api',
  // or
  // BASE_URL: 'https://medicare-backend.onrender.com/api',
  // or  
  // BASE_URL: 'https://api.yourdomain.com/api',
  
  TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};
```

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- Docker Docs: https://docs.docker.com

