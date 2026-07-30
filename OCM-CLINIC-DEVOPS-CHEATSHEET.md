# OCM Clinic DevOps Cheatsheet

Simple guide para sa pag-manage at pag-deploy ng **OCM Clinic System** sa DigitalOcean Droplet.

> **Current setup**
>
> - Server: DigitalOcean Droplet
> - Project folder: `/opt/rverse-clinic`
> - Deployment: Docker Compose
> - Compose file: `docker-compose.demo.yml`
> - App service: `app`
> - Database service: `postgres`
> - App container: `clinic-demo-app`
> - Database container: `clinic-demo-postgres`
> - App listens locally at: `127.0.0.1:3000`
> - Git branch: `main`

---

## 1. Important rule: Docker ang ginagamit

Walang kailangang `node`, `npm`, o `npx` sa mismong Droplet host.

Kapag ganito ang lumabas:

```text
npm: command not found
npx: command not found
```

Hindi ibig sabihin na sira ang server. Nasa Docker image/container ang Node.js at npm.

**Huwag basta mag-run ng:**

```bash
apt install npm
```

Baka magkaroon lang ng ibang Node/npm version sa host at mas lalo maging magulo ang setup.

---

## 2. Kumonekta sa Droplet

Mula sa Windows PowerShell:

```powershell
ssh root@143.198.207.119
```

Kapag first time kumonekta at tinanong:

```text
Are you sure you want to continue connecting?
```

Type:

```text
yes
```

Siguraduhin muna na tama talaga ang IP address ng Droplet.

---

## 3. Pumunta sa project repo

```bash
cd /opt/rverse-clinic
```

Confirm na nasa tamang folder:

```bash
pwd
git status
```

Expected folder:

```text
/opt/rverse-clinic
```

---

# STANDARD DEPLOYMENT FLOW

Ito ang normal na gagawin kapag may bago kang na-push sa GitHub at gusto mong i-deploy sa production.

---

## Step 1: Check muna ang Git status

```bash
git status
```

### Kapag clean ang repo

Halimbawa:

```text
nothing to commit, working tree clean
```

Proceed sa pag-fetch at pull.

### Kapag may modified file

Halimbawa:

```text
modified: src/lib/auth.ts
```

Huwag agad mag-pull. Tingnan muna ang exact change:

```bash
git diff -- src/lib/auth.ts
```

Sa current setup, may production-specific change sa `src/lib/auth.ts`. Hangga't hindi pa ito naililipat sa `.env`, kailangan muna itong i-stash bago mag-pull.

---

## Step 2: Check kung may bagong commits

```bash
git fetch origin
git status
```

Tingnan ang commits na nasa GitHub pero wala pa sa server:

```bash
git log --oneline HEAD..origin/main
```

Tingnan kung anong files ang magbabago:

```bash
git diff --name-only HEAD..origin/main
```

Kapag naging mahaba ang output at nakita mo ang:

```text
(END)
```

Pindutin:

```text
q
```

para makabalik sa terminal.

---

## Step 3A: Pull kapag clean ang repo

Kapag walang local modifications:

```bash
git pull --ff-only origin main
```

Ang `--ff-only` ay safety measure. Hindi nito basta gagawan ng unexpected merge commit ang production server.

---

## Step 3B: Pull kapag modified ang `src/lib/auth.ts`

Gamitin lang ito kapag confirmed na `src/lib/auth.ts` ang local production change na gusto mong panatilihin.

```bash
git stash push -m "prod auth config before deploy" -- src/lib/auth.ts
git pull --ff-only origin main
git stash pop
git status
```

Expected pagkatapos:

```text
modified: src/lib/auth.ts
```

Ibig sabihin, naibalik ang production-specific change.

Kapag may conflict pagkatapos ng `git stash pop`, **huwag muna mag-build**. Ayusin muna ang conflict.

> Huwag mag-`git stash pop` kung hindi ka naman gumawa ng bagong stash. Baka lumang stash ang ma-pop mo.

---

## Step 4: Backup ang database

Bago mag-run ng bagong Prisma migration, gumawa muna ng database backup.

```bash
mkdir -p /opt/backups/rverse-clinic
```

Then:

```bash
docker exec clinic-demo-postgres sh -c \
'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
> "/opt/backups/rverse-clinic/clinic-before-deploy-$(date +%F-%H%M%S).sql"
```

Check kung nagawa ang backup:

```bash
ls -lh /opt/backups/rverse-clinic
```

Expected na may `.sql` file at hindi `0 B` ang size.

---

## Step 5: Build ang bagong app image

```bash
docker compose -f docker-compose.demo.yml build app
```

Simple explanation:

- Kinukuha nito ang latest source code.
- Ini-install nito ang dependencies sa Docker build.
- Gumagawa ito ng bagong production-ready app image.
- Habang nagbu-build, tuloy pa rin ang lumang running app.

Kapag may error dito, **huwag muna mag-migrate o mag-recreate ng app container**. Basahin muna ang build error.

---

## Step 6: Apply ang Prisma database migrations

```bash
docker compose -f docker-compose.demo.yml run --rm app npx prisma migrate deploy
```

Simple explanation:

- Tinitingnan nito ang files sa `prisma/migrations`.
- Ina-apply lang nito ang migrations na hindi pa na-run sa production database.
- Hindi nito nire-reset ang database.
- Hindi nito dapat burahin ang existing records maliban na lang kung destructive mismo ang migration SQL.

Successful output usually ends with:

```text
All migrations have been successfully applied.
```

Kapag sinabi nitong walang pending migration, okay lang iyon.

---

## Step 7: Recreate ang app container

```bash
docker compose -f docker-compose.demo.yml up -d \
  --no-deps --force-recreate app
```

Simple explanation:

- Pinapalitan nito ang lumang app container gamit ang bagong image.
- App container lang ang nire-recreate.
- Hindi nito nire-restart ang PostgreSQL container.
- Posibleng magkaroon ng ilang segundong downtime habang nagre-restart ang app.

---

## Step 8: Verify ang deployment

### Check container status

```bash
docker compose -f docker-compose.demo.yml ps
```

Expected:

- `clinic-demo-app` — `Up`
- `clinic-demo-postgres` — `Up` at `healthy`

### Check app logs

```bash
docker compose -f docker-compose.demo.yml logs --tail=100 app
```

Good signs:

```text
Starting...
Ready
```

### Test ang app locally sa server

```bash
curl -I http://127.0.0.1:3000
```

Good responses include:

```text
HTTP/1.1 200 OK
```

Acceptable din ang redirect responses gaya ng `307` o `308`, depende sa page/auth behavior.

### Final browser check

Buksan ang actual website at hard refresh:

```text
Ctrl + F5
```

Test at least:

- Login
- Dashboard
- Page na binago
- Form submission
- Database-related feature na kasama sa update

---

# COPY-PASTE DEPLOYMENT CHECKLIST

## Kapag clean ang Git repo

```bash
cd /opt/rverse-clinic

git status
git fetch origin
git log --oneline HEAD..origin/main
git diff --name-only HEAD..origin/main
git pull --ff-only origin main

mkdir -p /opt/backups/rverse-clinic
docker exec clinic-demo-postgres sh -c \
'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
> "/opt/backups/rverse-clinic/clinic-before-deploy-$(date +%F-%H%M%S).sql"

docker compose -f docker-compose.demo.yml build app

docker compose -f docker-compose.demo.yml run --rm app \
  npx prisma migrate deploy

docker compose -f docker-compose.demo.yml up -d \
  --no-deps --force-recreate app

docker compose -f docker-compose.demo.yml ps
docker compose -f docker-compose.demo.yml logs --tail=100 app
curl -I http://127.0.0.1:3000
```

---

## Kapag modified ang production `src/lib/auth.ts`

```bash
cd /opt/rverse-clinic

git status
git diff -- src/lib/auth.ts

git stash push -m "prod auth config before deploy" -- src/lib/auth.ts
git pull --ff-only origin main
git stash pop
git status

mkdir -p /opt/backups/rverse-clinic
docker exec clinic-demo-postgres sh -c \
'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
> "/opt/backups/rverse-clinic/clinic-before-deploy-$(date +%F-%H%M%S).sql"

docker compose -f docker-compose.demo.yml build app

docker compose -f docker-compose.demo.yml run --rm app \
  npx prisma migrate deploy

docker compose -f docker-compose.demo.yml up -d \
  --no-deps --force-recreate app

docker compose -f docker-compose.demo.yml ps
docker compose -f docker-compose.demo.yml logs --tail=100 app
curl -I http://127.0.0.1:3000
```

---

# COMMON COMMANDS

## Tingnan ang running containers

```bash
docker ps
```

Cleaner view:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

---

## Tingnan ang app logs

Last 100 lines:

```bash
docker compose -f docker-compose.demo.yml logs --tail=100 app
```

Live logs:

```bash
docker compose -f docker-compose.demo.yml logs -f app
```

Para lumabas sa live logs:

```text
Ctrl + C
```

Hindi nito pinapatay ang app. Lumalabas ka lang sa log viewer.

---

## Tingnan ang PostgreSQL logs

```bash
docker compose -f docker-compose.demo.yml logs --tail=100 postgres
```

Live database logs:

```bash
docker compose -f docker-compose.demo.yml logs -f postgres
```

---

## Restart ang app

```bash
docker compose -f docker-compose.demo.yml restart app
```

Gamitin kapag temporary runtime issue lang at walang bagong source code.

> Ang `restart` ay hindi nagbu-build ng bagong code. Kapag may bagong Git changes, kailangan pa rin ng `build` at `up --force-recreate`.

---

## Stop at start ang app service

Stop:

```bash
docker compose -f docker-compose.demo.yml stop app
```

Start:

```bash
docker compose -f docker-compose.demo.yml start app
```

---

## Check Docker service

```bash
systemctl status docker
```

Restart Docker daemon only when necessary:

```bash
systemctl restart docker
```

Warning: puwedeng maapektuhan ang lahat ng running containers kapag ni-restart ang Docker service.

---

## Tingnan ang current Git commit

```bash
git rev-parse --short HEAD
```

Mas detailed:

```bash
git log -1 --oneline
```

---

## Tingnan ang recent commits

```bash
git log --oneline -10
```

---

## Tingnan ang remote repository

```bash
git remote -v
```

---

## Tingnan ang disk usage ng Droplet

```bash
df -h
```

Tingnan ang Docker disk usage:

```bash
docker system df
```

---

## Safe cleanup ng unused Docker images

```bash
docker image prune
```

Type `y` kapag sure.

Huwag basta gamitin ito sa production:

```bash
docker system prune -a
```

Mas aggressive iyon at puwedeng mag-delete ng images/resources na kailangan mo sa rollback.

---

# TROUBLESHOOTING

## Problem: `npm: command not found`

Reason: Dockerized ang app. Walang npm sa host.

Use:

```bash
docker compose -f docker-compose.demo.yml run --rm app npm --version
```

Or for Prisma:

```bash
docker compose -f docker-compose.demo.yml run --rm app \
  npx prisma migrate deploy
```

---

## Problem: Git pull ayaw dahil may local changes

Check:

```bash
git status
git diff
```

Kung `src/lib/auth.ts` lang at intentional production change:

```bash
git stash push -m "prod auth config before deploy" -- src/lib/auth.ts
git pull --ff-only origin main
git stash pop
```

Huwag agad gumamit ng:

```bash
git reset --hard
```

Buburahin nito ang uncommitted local changes.

---

## Problem: App container ay hindi nag-start

Check status:

```bash
docker compose -f docker-compose.demo.yml ps
```

Check logs:

```bash
docker compose -f docker-compose.demo.yml logs --tail=200 app
```

Common causes:

- Build error
- Missing environment variable
- Database connection error
- Prisma migration issue
- Port conflict
- Invalid production configuration

---

## Problem: Database is unhealthy

Check status:

```bash
docker compose -f docker-compose.demo.yml ps
```

Check logs:

```bash
docker compose -f docker-compose.demo.yml logs --tail=200 postgres
```

Huwag agad i-delete ang database container o volume.

Avoid commands tulad ng:

```bash
docker compose down -v
```

Ang `-v` ay puwedeng mag-delete ng database volume at data.

---

## Problem: `curl 127.0.0.1:3000` works pero public website ayaw

Kapag `HTTP 200` locally pero ayaw sa domain, malamang hindi na app container ang problem.

Possible areas:

- Reverse proxy
- Nginx configuration
- SSL certificate
- Firewall
- Domain/DNS

Kung may Nginx:

```bash
systemctl status nginx
nginx -t
```

Kapag valid ang config at kailangan ng reload:

```bash
systemctl reload nginx
```

Huwag mag-reload kapag failed ang `nginx -t`.

---

## Problem: Changes wala pa rin sa website

Possible reasons:

1. Nakapag-`git pull` pero hindi nakapag-build.
2. Nakapag-build pero hindi na-recreate ang app container.
3. Browser cache.
4. Service worker/PWA cache.
5. Wrong Git branch or commit.

Check current commit:

```bash
git log -1 --oneline
```

Rebuild and recreate:

```bash
docker compose -f docker-compose.demo.yml build app

docker compose -f docker-compose.demo.yml up -d \
  --no-deps --force-recreate app
```

Then hard refresh:

```text
Ctrl + F5
```

---

## Problem: Mahabang command output at may `(END)`

Nasa `less` pager ka.

Exit:

```text
q
```

Useful controls:

- `Space` — next page
- `b` — previous page
- `/word` — search
- `q` — quit

---

# DATABASE SAFETY RULES

1. Mag-backup bago mag-apply ng migration.
2. Huwag gamitin ang `prisma migrate dev` sa production.
3. Production command:

```bash
npx prisma migrate deploy
```

Sa Docker setup:

```bash
docker compose -f docker-compose.demo.yml run --rm app \
  npx prisma migrate deploy
```

4. Huwag gumamit ng `prisma migrate reset` sa production.
5. Huwag gumamit ng `docker compose down -v` maliban kung intentional mong buburahin ang database volume.
6. Huwag mag-edit ng production database nang walang backup.

---

# GIT SAFETY RULES

Safe commands:

```bash
git status
git diff
git fetch origin
git log --oneline HEAD..origin/main
git diff --name-only HEAD..origin/main
git pull --ff-only origin main
```

Commands na kailangan ng extra caution:

```bash
git reset --hard
git clean -fd
git checkout -- .
git restore .
```

Puwedeng burahin ng mga ito ang local production changes.

---

# EMERGENCY: APP IS DOWN AFTER DEPLOY

## 1. Check logs

```bash
cd /opt/rverse-clinic
docker compose -f docker-compose.demo.yml logs --tail=200 app
```

## 2. Check database

```bash
docker compose -f docker-compose.demo.yml ps
docker compose -f docker-compose.demo.yml logs --tail=100 postgres
```

## 3. Try recreating the app

```bash
docker compose -f docker-compose.demo.yml up -d \
  --no-deps --force-recreate app
```

## 4. Test locally

```bash
curl -I http://127.0.0.1:3000
```

## 5. Do not delete the database

Avoid:

```bash
docker compose down -v
docker volume prune
```

Kapag kailangan ng code rollback, alamin muna ang previous known-good commit at siguraduhing naka-backup ang current changes at database bago gumamit ng `git reset`.

---

# RECOMMENDED FUTURE IMPROVEMENTS

## 1. Ilipat ang production-only config sa `.env`

Ang `src/lib/auth.ts` ay currently nagiging modified sa production. Better na environment variables ang gamitin para:

- Laging clean ang `git status`
- Walang stash/pop kada deployment
- Hindi nahahalo ang server-specific settings sa source code

## 2. Rename ang Compose file

Current:

```text
docker-compose.demo.yml
```

Recommended later:

```text
docker-compose.prod.yml
```

Mas malinaw na production deployment ito at hindi demo environment.

## 3. Gumawa ng deployment script

Eventually, puwedeng maging isang command na lang ang deployment:

```bash
./deploy.sh
```

Pero bago i-automate, siguraduhing stable muna ang manual deployment process at database backup flow.

## 4. Set up automated backups

Recommended:

- Daily PostgreSQL backup
- Automatic retention, halimbawa last 7–14 days
- Backup stored outside the running database container
- Optional off-server backup

---

# QUICK MEMORY GUIDE

Kapag may bagong update:

```text
CHECK → PULL → BACKUP → BUILD → MIGRATE → RECREATE → VERIFY
```

Meaning:

1. **CHECK** — Tingnan ang Git status at incoming files.
2. **PULL** — Kunin ang latest code safely.
3. **BACKUP** — Backup muna ang production database.
4. **BUILD** — Gumawa ng bagong Docker app image.
5. **MIGRATE** — Apply pending Prisma migrations.
6. **RECREATE** — Palitan ang running app container.
7. **VERIFY** — Check status, logs, curl, at actual website.

---

_Last updated: July 30, 2026_
