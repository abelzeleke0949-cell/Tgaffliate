# Self-hosted MongoDB on the VPS

Assumes Ubuntu 22.04/24.04. Run as a user with sudo access.

## 1. Install MongoDB Community Edition

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable --now mongod
sudo systemctl status mongod
```

## 2. Create the app database user (with auth disabled, so the first user can be created)

```bash
mongosh
```

Inside the `mongosh` shell:

```js
use admin
db.createUser({
  user: "cpaHubAdmin",
  pwd: passwordPrompt(), // will prompt securely, or replace with a literal string
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }],
})
exit
```

## 3. Enable authorization

Edit `/etc/mongod.conf` and add (or uncomment) under `security`:

```yaml
security:
  authorization: enabled
```

Also confirm MongoDB only listens on localhost (default, but verify):

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
```

Restart:

```bash
sudo systemctl restart mongod
```

## 4. Create the application user, scoped to the cpa-hub database only

```bash
mongosh -u cpaHubAdmin -p --authenticationDatabase admin
```

```js
use cpa-hub
db.createUser({
  user: "cpaHubApp",
  pwd: passwordPrompt(),
  roles: [{ role: "readWrite", db: "cpa-hub" }],
})
exit
```

## 5. Update `backend/.env`

```env
MONGODB_URI=mongodb://cpaHubApp:YOUR_APP_PASSWORD@127.0.0.1:27017/cpa-hub?authSource=cpa-hub
```

## 6. Firewall

MongoDB must never be reachable from outside the VPS. Confirm `bindIp: 127.0.0.1` above, and
that your firewall (see `deploy/DEPLOYMENT.md`) does not open port 27017.

## 7. Backups (recommended before going live)

A simple daily cron dump:

```bash
sudo mkdir -p /var/backups/mongodb
echo '0 3 * * * root mongodump -u cpaHubApp -p YOUR_APP_PASSWORD --authenticationDatabase cpa-hub --db cpa-hub --out /var/backups/mongodb/$(date +\%F)' | sudo tee /etc/cron.d/mongodb-backup
```

Ship those dumps off the VPS periodically (e.g. `rsync` to another machine or object storage) —
a backup that only lives on the same disk as the database doesn't protect you from disk failure.
