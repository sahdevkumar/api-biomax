# BioMax Cloud

> **Serverless biometric attendance management via ADMS direct push.**  
> No local bridge required. Devices talk straight to Vercel over HTTPS.

---

## How it works

BioMax / ZKTeco devices support **ADMS push mode**: instead of your server polling devices over TCP, the device calls *you* — pushing punches as they happen, and polling for commands every 30 seconds.

```
BioMax Device  ──HTTPS POST /api/iclock/cdata──►  Cloudflare  ──►  Vercel (Next.js)
                ◄──config + queued commands ──────────────────────────────────────
                                                                         │
                                                                         ▼
                                                                    Supabase
                                                              (PostgreSQL + Realtime)
```

---

## Quick start

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run `supabase/schema.sql`
3. Optionally run `supabase/seed.sql` for sample data
4. Copy your **Project URL**, **anon key**, and **service role key**

### 2. Deploy to Vercel

```bash
# Clone and deploy
git clone https://github.com/yourorg/biomax-cloud.git
cd biomax-cloud
vercel deploy
```

Or connect your GitHub repo in the Vercel dashboard. The `vercel.json` at the root handles the build config automatically.

Add these environment variables in Vercel:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `ADMS_SECRET_TOKEN` | Generate: `openssl rand -hex 32` |

### 3. Configure your BioMax device

On the device keypad:

```
Main Menu → COMM → Cloud Server Setting
  Enable Domain Name  : ON
  Server Address      : your-app.vercel.app
  Server Port         : 443
  HTTPS               : Enable
```

The device will appear in the dashboard automatically on its first heartbeat (within 30 seconds).

> **Check ADMS support:** Go to `COMM → Cloud Server Setting`. If you don't see "Server Address / Port", your device doesn't support ADMS — use the optional TCP bridge instead (see below).

---

## Project structure

```
biomax-cloud/
├── apps/
│   ├── web/                         # Next.js 14 app (deploy to Vercel)
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── iclock/
│   │   │   │   │   ├── cdata/       # ADMS heartbeat + punch push
│   │   │   │   │   └── devicecmd/   # Command ACK from device
│   │   │   │   ├── devices/
│   │   │   │   │   ├── route.ts     # GET/POST devices
│   │   │   │   │   └── command/     # Queue management commands
│   │   │   │   ├── users/           # Employee CRUD
│   │   │   │   └── attendance/      # Attendance query
│   │   │   └── dashboard/           # React dashboard
│   │   └── lib/
│   │       ├── supabase.ts          # Supabase clients (anon + admin)
│   │       ├── types.ts             # TypeScript types
│   │       └── adms.ts              # ADMS protocol helpers + command builders
│   └── bridge/                      # Optional TCP bridge (Raspberry Pi / Docker)
│       ├── server.js
│       └── Dockerfile
├── supabase/
│   ├── schema.sql                   # Full database schema
│   └── seed.sql                     # Sample data
├── docker-compose.yml               # Bridge deployment
├── vercel.json                      # Vercel build config
└── README.md
```

---

## ADMS API endpoints

All three endpoints are called by the device — you don't call them manually.

### `GET /api/iclock/cdata`

Device heartbeat. Called every 30 seconds.

**Query params sent by device:**
- `SN` — device serial number
- `options=all` — sent only on first connect

**Server response:**
```
GET OPTION FROM: 2026-03-22T09:00:00.000Z
Stamp=1742634000
Delay=30
Realtime=1
Encrypt=None
C:12345:DATA UPDATE USER	PIN=001	Name=Arjun Sharma	Pri=0
```

Any pending commands from `device_commands` table are appended inline.

### `POST /api/iclock/cdata?table=ATTLOG`

Device pushes attendance punches.

**Body (tab-separated):**
```
001	2026-03-22 09:15:33	0	1	0	
002	2026-03-22 09:16:01	0	15	0	
```
Fields: `PIN  DateTime  Status  Verify  WorkCode  Reserved`

### `POST /api/iclock/cdata?table=OPERLOG`

Device pushes user records and biometric templates (after enrollment).

### `POST /api/iclock/devicecmd`

Device ACKs a command result.

---

## Device management commands

Queue commands via `POST /api/devices/command`:

```json
{
  "device_id": "<uuid>",
  "command": "SYNC_TIME"
}
```

| Command | ADMS string | Params needed |
|---|---|---|
| `ADD_USER` | `C:n DATA UPDATE USER` | `PIN, Name, Pri?` |
| `DELETE_USER` | `C:n DATA DELETE USER` | `PIN` |
| `ENROLL_FP` | `C:n ENROLL_BIO Type=1` | `PIN, FID?` |
| `ENROLL_FACE` | `C:n ENROLL_BIO Type=9` | `PIN` |
| `PUSH_TEMPLATE` | `C:n DATA UPDATE TEMPLATEV10` | `PIN, FID, TMP, Size` |
| `SYNC_TIME` | `C:n SET OPTIONS DateTime=…` | — |
| `REBOOT` | `C:n SET OPTIONS Reboot=1` | — |
| `QUERY_USERS` | `C:n DATA QUERY USER` | `PIN?` |
| `GET_INFO` | `C:n GET OPTIONS ~SN,~FirmVer,…` | — |

Commands are delivered on the next heartbeat (≤30 seconds).

---

## Optional TCP bridge

For use cases that need instant (sub-second) TCP commands or legacy devices without ADMS:

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Set DEVICES_JSON with your device UUIDs and IPs

docker compose up -d
```

The bridge polls Supabase every 5 seconds and executes commands directly over TCP using the ZKTeco SDK. It runs alongside the ADMS system — both can coexist.

---

## Database tables

| Table | Purpose |
|---|---|
| `devices` | Registered BioMax devices. Auto-created on first ADMS heartbeat. |
| `users` | Employee records. Linked by `employee_code` = device PIN. |
| `device_users` | Many-to-many: which users are enrolled on which devices. |
| `attendance_logs` | Every punch. Realtime-enabled for live dashboard updates. |
| `device_commands` | Command queue. Status: `PENDING → SENT → SUCCESS/FAILED`. |

---

## Security

- All device traffic goes over HTTPS (TLS 1.3 via Cloudflare)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never exposed to the client
- Row Level Security enabled on all tables
- Dashboard uses the anon key + RLS policies
- ADMS endpoints use the service role key — keep `ADMS_SECRET_TOKEN` secret and validate it in middleware if you want additional request-level auth

---

## Roadmap

- [ ] Middleware auth on ADMS endpoints (`X-Token` header validation)
- [ ] Attendance report export (CSV / PDF)
- [ ] Shift scheduling + late/absent detection via Supabase Edge Functions
- [ ] Batch user enrollment UI
- [ ] Mobile PWA
- [ ] Multi-tenant support

---

## Development

```bash
# Install
cd apps/web && npm install

# Copy env
cp .env.example .env.local
# Fill in your Supabase credentials

# Run dev server
npm run dev
# Dashboard: http://localhost:3000/dashboard

# Simulate a device heartbeat locally
curl "http://localhost:3000/api/iclock/cdata?SN=TEST-001&options=all"

# Simulate a punch push
curl -X POST "http://localhost:3000/api/iclock/cdata?SN=TEST-001&table=ATTLOG" \
  -d "EMP001	$(date '+%Y-%m-%d %H:%M:%S')	0	1	0	"
```

---

## Acknowledgements

- [ZKTeco ADMS Protocol](https://github.com/adrobinoga/zk-protocol) — protocol documentation
- [Supabase](https://supabase.com) — backend infrastructure
- [Vercel](https://vercel.com) — serverless hosting
- [Cloudflare](https://cloudflare.com) — edge security

---

**Version:** 2.0.0 — ADMS direct (bridgeless)  
**Last updated:** 2026-03-22
