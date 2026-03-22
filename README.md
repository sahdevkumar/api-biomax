# BioMax Cloud — Bridgeless ADMS Attendance System

Full-stack attendance management for ZKTeco/BioMax devices. No local bridge required — devices connect directly to Vercel via ADMS push protocol over HTTPS.

## Stack
- **Next.js 14** (App Router) on Vercel
- **Supabase** (PostgreSQL, Realtime, Auth)
- **ADMS protocol** — direct device-to-cloud over HTTPS port 443

## Quick start

### 1. Database
Run `supabase/schema.sql` in your Supabase SQL editor.

### 2. Environment variables
Copy `.env.local.example` → `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Deploy to Vercel
```bash
npm i -g vercel
vercel --prod
```
Then add the same env vars in your Vercel project settings.

### 4. Configure your BioMax device
On device: **Menu → COMM → Cloud Server Setting**
| Field | Value |
|---|---|
| Server address | `your-app.vercel.app` |
| Server port | `443` |
| Enable domain name | ON |
| HTTPS | Enable |

## API reference

### ADMS endpoints (called by device)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/iclock/cdata` | Device heartbeat + command delivery |
| POST | `/api/iclock/cdata` | Punch / user / template push |
| GET | `/api/iclock/getrequest` | Command poll |
| POST | `/api/iclock/devicecmd` | Command acknowledgement |

### Management API
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/devices` | List / register devices |
| GET/PATCH/DELETE | `/api/devices/[id]` | Device detail |
| POST | `/api/devices/[id]/command` | Queue command |
| GET/POST | `/api/users` | List / create users |
| GET/PATCH/DELETE | `/api/users/[id]` | User detail |
| GET | `/api/attendance` | Query attendance logs |
| GET | `/api/commands` | Command history |

## Supported device commands
`ADD_USER` · `DELETE_USER` · `ENROLL_FP` · `ENROLL_FACE` · `DELETE_FP` · `PUSH_FP_TEMPLATE` · `SYNC_TIME` · `REBOOT` · `GET_INFO` · `QUERY_USERS` · `CLEAR_LOGS`
