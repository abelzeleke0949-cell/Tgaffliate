# Cloudflare setup for lightb.tech

Adds three new subdomains to your existing `lightb.tech` zone. This only touches DNS records
and Nginx config for `app` / `api` / `admin` — it doesn't change anything about whatever else is
already running on that domain.

## 1. Find the VPS's public IP

```bash
curl -4 ifconfig.me
```

## 2. DNS records

Cloudflare dashboard → `lightb.tech` → DNS → Records → Add record, three times:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| A | `app` | `<VPS_IP>` | Proxied (orange cloud) |
| A | `api` | `<VPS_IP>` | Proxied (orange cloud) |
| A | `admin` | `<VPS_IP>` | Proxied (orange cloud) |

Proxied means Cloudflare sits in front (CDN, DDoS protection, hides the VPS's IP). That's what
the rest of this guide assumes — if you'd rather bypass Cloudflare for one of these (DNS-only /
grey cloud), skip the Origin CA cert below and use Let's Encrypt (`certbot --nginx`) for that
hostname instead.

## 3. SSL/TLS mode

Cloudflare dashboard → `lightb.tech` → SSL/TLS → Overview → set mode to **Full (strict)**.

This is a zone-wide setting shared with your existing site on this domain. Full (strict) requires
a valid certificate at the origin — check what your existing site's origin already uses first:

- If it's already on Full (strict) with a real cert (Let's Encrypt or Cloudflare Origin CA),
  you're set — nothing to change, just add the cert for the new subdomains (step 4).
- If the existing site relies on Flexible or Full (not strict), changing the zone-wide mode to
  Full (strict) will break it unless its origin also gets a valid cert. In that case, either give
  the existing origin a cert too, or ask before flipping a zone-wide setting that isn't yours to
  risk breaking.

## 4. Origin CA certificate

Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate.
- Hostnames: `*.lightb.tech, lightb.tech` (wildcard covers `app`/`api`/`admin` and anything added later)
- Key type: RSA (2048)
- Validity: 15 years

Cloudflare shows two blocks of text once: the **Origin Certificate** and the **Private Key**.
Save them on the VPS:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/lightb.tech.pem   # paste the Origin Certificate, save
sudo nano /etc/ssl/cloudflare/lightb.tech.key   # paste the Private Key, save
sudo chmod 600 /etc/ssl/cloudflare/lightb.tech.key
```

This cert is only trusted by Cloudflare, not by browsers directly — that's fine, browsers only
ever talk to Cloudflare's edge cert. It doesn't expire for 15 years, so there's no renewal cron
job needed (unlike Let's Encrypt).

## 5. Restore real visitor IPs at Nginx

Proxied traffic arrives at the VPS from Cloudflare's edge IPs, not the visitor's. Install the
real-IP config once (applies to every site on the box):

```bash
sudo cp deploy/nginx/cloudflare-realip.conf /etc/nginx/conf.d/cloudflare-realip.conf
sudo nginx -t && sudo systemctl reload nginx
```

This matters for the backend's per-IP rate limiting (`express-rate-limit` in
`backend/src/server.js`) — without it, every visitor would appear to share Cloudflare's IP and
either all get rate-limited together or the limiter becomes meaningless.

## 6. Then continue with the site configs

`deploy/nginx/app.conf`, `api.conf`, `ad.conf` are already written for
`app.lightb.tech` / `api.lightb.tech` / `ad.lightb.tech` and point at the Origin CA cert from
step 4 — see `deploy/DEPLOYMENT.md` step 8 to install them.

## Optional: lock the admin dashboard down further

`ad.lightb.tech` manages real money (pausing campaigns, disabling merchants) and only has its
own login as a gate. Cloudflare Access (Zero Trust → Access → Applications) can put an extra
login wall — email OTP, Google SSO, etc. — in front of that hostname specifically, without
touching `app`/`api`. Worth doing before handing out admin accounts to anyone else.
