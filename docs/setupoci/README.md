# OCI Always Free Backend Setup (Supabase DB + OCI Runtime)

This guide moves backend infrastructure to Oracle Cloud Always Free while keeping Supabase for Postgres.

Scope in this guide:
- API runtime on OCI Compute (Dockerized Rust API)
- Redis on OCI Compute (container)
- Object storage on OCI Object Storage (S3-compatible endpoint)
- TLS termination and reverse proxy with Caddy on OCI Compute
- Supabase remains the managed Postgres system of record

## 1. Target Architecture

- `Supabase Postgres` (managed, external)
- `OCI Compute VM (A1 Flex)` hosting:
  - `api` container (`apps/api/Dockerfile`)
  - `redis` container
  - `caddy` container (public ingress over HTTPS)
- `OCI Object Storage` bucket for original images and thumbnails

## 2. Always Free Resource Budget

Use this baseline:
- 1x `VM.Standard.A1.Flex` instance at `2 OCPU / 12 GB RAM`
- 1 boot volume (50 GB)
- 1 Object Storage bucket
- 1 VCN + public subnet + NSG

Reference: https://www.oracle.com/cloud/free/

## 3. Prerequisites

- OCI account with a selected home region.
- Domain name you control (for HTTPS).
- Supabase project with connection string.
- Local machine with `ssh` and `git`.

## 4. OCI IAM and Network Setup

### 4.1 Create Compartment

Create a dedicated compartment, for example:
- `through-your-letters-prod`

### 4.2 Create IAM Group + Policy

Create a group (example `ttl-admins`) and attach policies in your tenancy:

```text
Allow group ttl-admins to manage instance-family in compartment through-your-letters-prod
Allow group ttl-admins to manage virtual-network-family in compartment through-your-letters-prod
Allow group ttl-admins to manage object-family in compartment through-your-letters-prod
Allow group ttl-admins to manage volume-family in compartment through-your-letters-prod
Allow group ttl-admins to manage alarms in compartment through-your-letters-prod
```

### 4.3 Create VCN and Subnet

Create:
- 1 VCN with internet gateway
- 1 public subnet
- 1 network security group (NSG)

NSG ingress rules:
- TCP 22 from your office/home IP CIDR only
- TCP 80 from `0.0.0.0/0`
- TCP 443 from `0.0.0.0/0`

NSG egress rules:
- All egress allowed

Reference: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securityrules.htm

## 5. Create and Harden Compute Instance

Create an instance in `through-your-letters-prod`:
- Shape: `VM.Standard.A1.Flex`
- Image: Ubuntu 22.04 LTS
- OCPU: 2
- Memory: 12 GB
- Boot volume: 50 GB
- Attach NSG from step 4
- Assign public IPv4

SSH and harden:

```bash
ssh ubuntu@<PUBLIC_IP>

sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg jq unzip ufw fail2ban

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo systemctl enable fail2ban --now
```

## 6. Install Docker Engine and Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

docker version
docker compose version
```

## 7. Prepare Oracle Object Storage (S3-Compatible)

Use OCI CLI or console. CLI path is shown below.

Install CLI (on your operator machine):
- https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm

Configure CLI:

```bash
oci setup config
```

Get namespace:

```bash
oci os ns get --query data --raw-output
```

Create bucket (public read, no list):

```bash
oci os bucket create \
  --compartment-id <COMPARTMENT_OCID> \
  --namespace-name <NAMESPACE> \
  --name through-your-letters \
  --storage-tier Standard \
  --public-access-type ObjectReadWithoutList
```

Create customer secret key (S3-style credentials):

```bash
oci iam customer-secret-key create \
  --user-id <USER_OCID> \
  --display-name ttyl-api-storage
```

Store both values securely:
- Access key ID
- Secret access key (shown only once)

S3 compatibility reference:
- https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm
- https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/managingbuckets_topic-To_create_a_bucket.htm

## 8. Deploy Application Stack on OCI VM

### 8.1 Clone Repository on VM

```bash
sudo mkdir -p /opt/through-your-letters
sudo chown -R $USER:$USER /opt/through-your-letters
cd /opt/through-your-letters
git clone https://github.com/akankshyasub-hash/through-your-letters.git .
```

### 8.2 Create API Environment File

```bash
cp docs/setupoci/.env.api.example docs/setupoci/.env.api
```

Edit `docs/setupoci/.env.api` and set all values explicitly:
- `DATABASE_URL` -> Supabase pooled connection string
- `REDIS_URL` -> `redis://redis:6379`
- `R2_*` vars -> OCI Object Storage S3 endpoint and credentials
- `JWT_SECRET` -> long random value
- `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`

Generate admin bcrypt hash:

```bash
python3 - <<'PY'
import bcrypt
print(bcrypt.hashpw(b"ChangeMe-Admin-Password", bcrypt.gensalt(rounds=12)).decode())
PY
```

### 8.3 Configure Caddy Domain

Edit first line in `docs/setupoci/Caddyfile` to your API domain, for example:

```text
api.example.com {
```

Point your DNS `A` record (`api.example.com`) to the OCI VM public IP.

### 8.4 Build and Run

From repo root on VM:

```bash
docker compose -f docs/setupoci/docker-compose.oci.yml pull
docker compose -f docs/setupoci/docker-compose.oci.yml build --no-cache api
docker compose -f docs/setupoci/docker-compose.oci.yml up -d
```

Check status:

```bash
docker compose -f docs/setupoci/docker-compose.oci.yml ps
docker compose -f docs/setupoci/docker-compose.oci.yml logs -f api
```

## 9. Health Validation Checklist

Run from your local machine:

```bash
curl -i https://api.example.com/health
```

Expect `200` and a healthy payload.

Then validate:
- Auth register/login works.
- Upload works and returns approved/processing status.
- Uploaded image URL opens from OCI bucket public URL.
- `/api/v1/letterings` returns newly uploaded entries.
- Admin login and moderation actions succeed.

## 10. Operational Hardening

### 10.1 Auto-start on Reboot

Create systemd unit:

```bash
sudo tee /etc/systemd/system/ttyl-compose.service >/dev/null <<'EOF'
[Unit]
Description=Through Your Letters OCI stack
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/through-your-letters
ExecStart=/usr/bin/docker compose -f docs/setupoci/docker-compose.oci.yml up -d
ExecStop=/usr/bin/docker compose -f docs/setupoci/docker-compose.oci.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ttyl-compose
```

### 10.2 Logs and Rotation

Set Docker log rotation in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

### 10.3 Backups

- Supabase handles DB backups on their platform.
- Configure OCI boot volume backup policy for VM.
- Keep bucket lifecycle rules as required for retention.

## 11. Rolling Updates

Deploy new backend version:

```bash
cd /opt/through-your-letters
git pull origin main
docker compose -f docs/setupoci/docker-compose.oci.yml build api
docker compose -f docs/setupoci/docker-compose.oci.yml up -d api
```

## 12. Rollback

If deployment fails:

```bash
cd /opt/through-your-letters
git checkout <LAST_KNOWN_GOOD_COMMIT>
docker compose -f docs/setupoci/docker-compose.oci.yml build api
docker compose -f docs/setupoci/docker-compose.oci.yml up -d api
```

## 13. Required Environment Values for OCI Object Storage

Use these exact patterns:

```bash
R2_ACCESS_KEY_ID=<customer_secret_access_key_id>
R2_SECRET_ACCESS_KEY=<customer_secret_access_secret>
R2_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oci.customer-oci.com
R2_REGION=<region>
R2_FORCE_PATH_STYLE=true
R2_BUCKET_NAME=through-your-letters
R2_PUBLIC_URL=https://<namespace>.compat.objectstorage.<region>.oci.customer-oci.com/through-your-letters
```

These variables are intentionally the same `R2_*` names used by the current backend so no code fork is required.
