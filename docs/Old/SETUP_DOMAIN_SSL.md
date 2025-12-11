# 🌐 Setup Dominio e SSL per ai-platform.dffm.it

**Data**: 7 Dicembre 2025  
**Dominio**: ai-platform.dffm.it  
**Server**: 192.168.1.244

---

## 📋 Prerequisiti

- [ ] Dominio `ai-platform.dffm.it` punta all'IP pubblico di pfSense
- [ ] Port forwarding pfSense: 80, 443 → 192.168.1.244
- [ ] Nginx installato su 192.168.1.244 (o container dedicato)

---

## 🔐 Opzione 1: Let's Encrypt (Consigliato)

### 1. Installa Certbot

```bash
# Su Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Verifica installazione
certbot --version
```

### 2. Ottieni Certificato SSL

```bash
# Automatic mode (configura Nginx automaticamente)
sudo certbot --nginx -d ai-platform.dffm.it

# Oppure manual mode (solo certificato)
sudo certbot certonly --nginx -d ai-platform.dffm.it
```

**Durante il processo:**
- Email: `tua-email@esempio.com`
- Agree to Terms: `Yes`
- Share email: `No` (opzionale)
- Redirect HTTP to HTTPS: `Yes`

### 3. Verifica Certificati

```bash
sudo ls -la /etc/letsencrypt/live/ai-platform.dffm.it/
# Output:
# cert.pem       -> Certificato pubblico
# chain.pem      -> Catena intermediari
# fullchain.pem  -> cert.pem + chain.pem
# privkey.pem    -> Chiave privata
```

### 4. Aggiorna Nginx Config

Modifica `/etc/nginx/sites-available/ai-platform.conf`:

```nginx
ssl_certificate /etc/letsencrypt/live/ai-platform.dffm.it/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/ai-platform.dffm.it/privkey.pem;
```

### 5. Testa e Riavvia Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Auto-Renewal Setup

Certbot installa automaticamente un cron job. Verifica:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 🔐 Opzione 2: Certificato Self-Signed (Solo per testing)

### 1. Genera Certificato

```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /etc/nginx/ssl/ai-platform.dffm.it.key \
  -out /etc/nginx/ssl/ai-platform.dffm.it.crt \
  -subj "/C=IT/ST=Italy/L=YourCity/O=DFFM/CN=ai-platform.dffm.it"
```

### 2. Configura Nginx

Usa i path generati nel file `nginx/ai-platform.conf`:

```nginx
ssl_certificate /etc/nginx/ssl/ai-platform.dffm.it.crt;
ssl_certificate_key /etc/nginx/ssl/ai-platform.dffm.it.key;
```

### 3. Aggiungi Certificato ai Browser

- Chrome: Settings → Security → Manage certificates → Import `ai-platform.dffm.it.crt`
- Firefox: Preferences → Privacy & Security → View Certificates → Import

⚠️ **Nota**: Self-signed non funziona bene con Google OAuth in produzione.

---

## 🚀 Deploy Nginx Configuration

### 1. Copia Config

```bash
sudo cp /home/giuseppe/ai-platform/nginx/ai-platform.conf \
  /etc/nginx/sites-available/ai-platform.conf

sudo ln -s /etc/nginx/sites-available/ai-platform.conf \
  /etc/nginx/sites-enabled/
```

### 2. Disabilita Config Default (opzionale)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 3. Test Syntax

```bash
sudo nginx -t
```

### 4. Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 🧪 Test Configurazione

### 1. Test DNS

```bash
nslookup ai-platform.dffm.it
# Deve puntare all'IP pubblico di pfSense
```

### 2. Test HTTP → HTTPS Redirect

```bash
curl -I http://ai-platform.dffm.it
# Output: HTTP/1.1 301 Moved Permanently
# Location: https://ai-platform.dffm.it/
```

### 3. Test SSL

```bash
curl -I https://ai-platform.dffm.it
# Output: HTTP/2 200
```

### 4. Test SSL Grade

Vai su: https://www.ssllabs.com/ssltest/analyze.html?d=ai-platform.dffm.it

Obiettivo: **A o A+ grade**

### 5. Test Security Headers

```bash
curl -I https://ai-platform.dffm.it
# Cerca: Strict-Transport-Security, X-Frame-Options, CSP
```

---

## 🔧 Configurazione pfSense

### 1. Port Forwarding

**Firewall → NAT → Port Forward**

| Protocol | Source | Dest Port | Redirect IP     | Redirect Port |
|----------|--------|-----------|-----------------|---------------|
| TCP      | Any    | 80        | 192.168.1.244   | 80            |
| TCP      | Any    | 443       | 192.168.1.244   | 443           |

### 2. Firewall Rules

**Firewall → Rules → WAN**

Aggiungi regole per permettere traffico in entrata su porte 80/443.

### 3. DNS (opzionale)

Se pfSense gestisce DNS interno, aggiungi:
- **Host override**: `ai-platform.dffm.it` → `192.168.1.244`

---

## 🐳 Alternativa: Nginx in Docker

Se preferisci Nginx containerizzato:

### docker-compose.yml

```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: ai_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ai-platform.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./nginx/logs:/var/log/nginx
    networks:
      - ai-network
    depends_on:
      - frontend
      - backend

networks:
  ai-network:
    driver: bridge
```

### Comandi

```bash
docker compose up -d nginx
docker compose logs nginx --tail=50
```

---

## 🔄 Aggiorna Google OAuth Redirect URIs

Dopo aver configurato SSL, vai su **Google Cloud Console**:

1. **APIs & Services** → **Credentials**
2. Seleziona il tuo OAuth 2.0 Client ID
3. **Authorized redirect URIs**, aggiungi:
   ```
   https://ai-platform.dffm.it
   https://ai-platform.dffm.it/api/auth/google/callback
   ```
4. **SAVE**

---

## 🔄 Aggiorna Variabili Ambiente

### Backend (.env)

```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
JWT_SECRET_KEY=$(openssl rand -base64 64)
ALLOWED_ORIGINS=https://ai-platform.dffm.it
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=https://ai-platform.dffm.it/api/v1
```

### Riavvia Container

```bash
cd /home/giuseppe/ai-platform
docker compose restart
```

---

## ✅ Checklist Finale

- [ ] DNS `ai-platform.dffm.it` punta a IP pubblico pfSense
- [ ] Port forwarding 80/443 configurato su pfSense
- [ ] Certificato SSL installato (Let's Encrypt o self-signed)
- [ ] Nginx config copiato in `/etc/nginx/sites-enabled/`
- [ ] Nginx restart senza errori (`sudo nginx -t`)
- [ ] Test curl HTTP → HTTPS redirect
- [ ] Test curl HTTPS 200 OK
- [ ] SSLLabs test grade A/A+
- [ ] Google OAuth redirect URIs aggiornati con HTTPS
- [ ] Environment variables aggiornate (backend + frontend)
- [ ] Container restart completato
- [ ] Test login Google OAuth su `https://ai-platform.dffm.it/login`
- [ ] Chat streaming funziona con HTTPS
- [ ] Aggiornato `PRE_PRODUCTION_CHECKLIST.md` con progress

---

## 🛠️ Troubleshooting

### Errore: "ERR_CONNECTION_REFUSED"
- Verifica che Nginx sia in ascolto su 443: `sudo netstat -tlnp | grep :443`
- Controlla firewall locale: `sudo ufw status`

### Errore: "NET::ERR_CERT_AUTHORITY_INVALID"
- Normale per certificati self-signed
- Per Let's Encrypt: verifica che fullchain.pem sia usato

### Errore: "502 Bad Gateway"
- Backend non raggiungibile da Nginx
- Verifica che i container siano UP: `docker compose ps`
- Controlla IP backend in `proxy_pass`

### Chat streaming non funziona
- Verifica `proxy_buffering off;` in Nginx config
- Controlla che WebSocket sia supportato per SSE

---

**Prossimo Step**: Configurare pfSense port forwarding e testare accesso esterno.
