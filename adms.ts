/**
 * ADMS protocol helpers
 * Parses ZKTeco iClock push payloads and formats command responses.
 */

import type { AdmsPunchRecord, AdmsUserRecord, AdmsFpTemplate } from './types'

// ─── Verify mode mapping ─────────────────────────────────────────────────────
const VERIFY_MAP: Record<string, string> = {
  '0': 'PASSWORD', '1': 'FINGERPRINT', '2': 'FINGERPRINT',
  '3': 'FINGERPRINT', '4': 'CARD', '6': 'FINGERPRINT',
  '10': 'FACE', '15': 'FACE', '20': 'FACE_FINGERPRINT',
}

// ─── Status / record type mapping ────────────────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  '0': 'CHECK_IN', '1': 'CHECK_OUT',
  '2': 'BREAK_OUT', '3': 'BREAK_IN',
  '4': 'OVERTIME_IN', '5': 'OVERTIME_OUT',
}

export function parseVerifyMode(code: string) {
  return (VERIFY_MAP[code] ?? 'FINGERPRINT') as import('./types').VerifyMode
}

export function parseRecordType(code: string) {
  return (STATUS_MAP[code] ?? 'CHECK_IN') as import('./types').RecordType
}

/**
 * Parse ATTLOG body:
 * "PIN\tTime\tStatus\tVerify\tWorkCode\tReserved\n..."
 */
export function parseAttlog(body: string): AdmsPunchRecord[] {
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(line => {
      const [pin, time, status, verify, workcode, reserved] = line.split('\t')
      return { pin, time, status, verify, workcode, reserved }
    })
    .filter(r => r.pin && r.time)
}

/**
 * Parse OPERLOG rows for USER and FP tables.
 * Format: "USER PIN=x\tName=y\tPri=z\t..."
 */
export function parseOperlog(body: string): {
  users: AdmsUserRecord[]
  fingerprints: AdmsFpTemplate[]
} {
  const users: AdmsUserRecord[] = []
  const fingerprints: AdmsFpTemplate[] = []

  for (const line of body.split('\n')) {
    const l = line.trim()
    if (!l) continue

    if (l.startsWith('USER')) {
      const fields = parseKV(l.replace(/^USER\s*/, ''))
      users.push({
        pin:      fields.PIN  ?? fields.pin  ?? '',
        name:     fields.Name ?? fields.name ?? '',
        pri:      fields.Pri  ?? fields.pri  ?? '0',
        password: fields.Passwd,
        card:     fields.Card,
        grp:      fields.Grp,
        tz:       fields.TZ,
        verify:   fields.Verify,
      })
    } else if (l.startsWith('FP') || l.startsWith('TEMPLATEV10')) {
      const fields = parseKV(l.replace(/^(FP|TEMPLATEV10)\s*/, ''))
      fingerprints.push({
        pin:   fields.PIN  ?? fields.pin  ?? '',
        fid:   fields.FID  ?? fields.fid  ?? '0',
        valid: fields.Valid ?? '1',
        tmp:   fields.TMP  ?? fields.Tmp  ?? '',
        size:  fields.Size ?? '0',
      })
    }
  }

  return { users, fingerprints }
}

/** Parse "Key=Value\tKey2=Value2" into a plain object */
function parseKV(str: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of str.split('\t')) {
    const idx = pair.indexOf('=')
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return out
}

// ─── Server → Device command builders ────────────────────────────────────────

/** C:295 DATA UPDATE USER — add/update user on device */
export function cmdAddUser(id: number, opts: {
  pin: string; name: string; pri?: number; password?: string; card?: string
}) {
  const fields = [
    `PIN=${opts.pin}`, `Name=${opts.name}`, `Pri=${opts.pri ?? 0}`,
    opts.password ? `Passwd=${opts.password}` : null,
    opts.card     ? `Card=${opts.card}`       : null,
    'Verify=0', 'ViceCard=',
  ].filter(Boolean).join('\t')
  return `C:${id}:DATA UPDATE USER\t${fields}`
}

/** C:295 DATA DELETE USER */
export function cmdDeleteUser(id: number, pin: string) {
  return `C:${id}:DATA DELETE USER\tPIN=${pin}`
}

/** C:295 DATA UPDATE TEMPLATEV10 — push fingerprint template */
export function cmdPushTemplate(id: number, opts: {
  pin: string; fid: string; tmp: string; size: number
}) {
  return `C:${id}:DATA UPDATE TEMPLATEV10\tPIN=${opts.pin}\tFID=${opts.fid}\tSize=${opts.size}\tValid=1\tTMP=${opts.tmp}`
}

/** C:395 ENROLL_BIO — trigger on-device biometric enrollment */
export function cmdEnrollBio(id: number, pin: string, type: 1 | 9 = 1, fid = 0) {
  // type 1 = fingerprint, type 9 = face
  return `C:${id}:ENROLL_BIO\tPIN=${pin}\tFID=${fid}\tType=${type}\tBackupNumber=0`
}

/** C:401 SET OPTIONS DateTime — sync time */
export function cmdSyncTime(id: number) {
  const now = new Date()
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  return `C:${id}:SET OPTIONS\tDateTime=${ts}`
}

/** C:403 SET OPTIONS Reboot=1 */
export function cmdReboot(id: number) {
  return `C:${id}:SET OPTIONS\tReboot=1`
}

/** C:408 GET OPTIONS */
export function cmdGetInfo(id: number) {
  return `C:${id}:GET OPTIONS\t~SN,~ProductName,~FirmVer,~MAC,~UserCount,~FPCount,~FaceCount`
}

/** C:415 DATA QUERY USER */
export function cmdQueryUsers(id: number, pin?: string) {
  return pin
    ? `C:${id}:DATA QUERY USER\tPIN=${pin}`
    : `C:${id}:DATA QUERY USER`
}

function pad(n: number) { return String(n).padStart(2, '0') }

// ─── Server response builder ──────────────────────────────────────────────────

/** Build the text response returned to the device on GET /iclock/cdata */
export function buildHeartbeatResponse(opts: {
  stamp: number
  delay?: number        // poll interval seconds (default 30)
  realtime?: number     // 1 = push immediately
  pendingCommands: string[]
}) {
  const lines = [
    `GET OPTION FROM: ${new Date().toISOString()}`,
    `Stamp=${opts.stamp}`,
    `OpStamp=${opts.stamp}`,
    `ErrorDelay=30`,
    `Delay=${opts.delay ?? 30}`,
    `ResLogLines=3`,
    `Realtime=${opts.realtime ?? 1}`,
    `Encrypt=None`,
  ]
  if (opts.pendingCommands.length > 0) {
    lines.push(...opts.pendingCommands)
  }
  return lines.join('\r\n') + '\r\n'
}
