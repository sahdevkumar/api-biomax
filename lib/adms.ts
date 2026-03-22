import { parseADMSRecord, verifyModeToLabel, statusToRecordType } from './utils'

export interface ADMSPunch {
  pin: string
  punch_time: string
  record_type: string
  verify_mode: string
  workcode: string
  raw: string
}

export interface ADMSUser {
  pin: string
  name: string
  privilege: string
  password: string
  card: string
  group: string
  timezone: string
  verify_style: string
}

export interface ADMSTemplate {
  pin: string
  finger_id: string
  valid: string
  template: string
}

export function parseAttendanceLogs(body: string): ADMSPunch[] {
  const punches: ADMSPunch[] = []
  const lines = body.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('table=') || trimmed.startsWith('Stamp=')) continue
    const parts = trimmed.split('\t')
    if (parts.length >= 2) {
      punches.push({
        pin: parts[0],
        punch_time: parts[1],
        record_type: statusToRecordType(parts[2] || '0'),
        verify_mode: verifyModeToLabel(parts[3] || '1'),
        workcode: parts[4] || '0',
        raw: trimmed,
      })
    }
  }
  return punches
}

export function parseUserRecords(body: string): ADMSUser[] {
  const users: ADMSUser[] = []
  const lines = body.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('PIN=')) continue
    const fields = Object.fromEntries(
      trimmed.split('\t').map(f => {
        const idx = f.indexOf('=')
        return [f.slice(0, idx).toLowerCase(), f.slice(idx + 1)]
      })
    )
    users.push({
      pin: fields['pin'] || '',
      name: fields['name'] || '',
      privilege: fields['pri'] || '0',
      password: fields['passwd'] || '',
      card: fields['card'] || '',
      group: fields['grp'] || '1',
      timezone: fields['tz'] || '1',
      verify_style: fields['verifystyle'] || '0',
    })
  }
  return users
}

export function parseTemplates(body: string): ADMSTemplate[] {
  const templates: ADMSTemplate[] = []
  const lines = body.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split('\t')
    if (parts.length >= 4) {
      templates.push({
        pin: parts[0],
        finger_id: parts[1],
        valid: parts[2],
        template: parts[3],
      })
    }
  }
  return templates
}

export function buildHeartbeatResponse(
  stamp: number,
  commands: Array<{ id: string; command: string; params: Record<string, unknown> }>,
  options = { delay: 30, realtime: 1, encrypt: 0 }
): string {
  const lines = [
    `GET OPTION FROM: ${stamp}`,
    `Stamp=${stamp}`,
    `Delay=${options.delay}`,
    `TransTimes=00:00;14:05`,
    `TransInterval=1`,
    `TransFlag=TransData AttLog OpLog EnrollUser EnrollFP FACE`,
    `Realtime=${options.realtime}`,
    `Encrypt=${options.encrypt}`,
  ]

  for (const cmd of commands) {
    const cmdLine = buildCommandLine(cmd)
    if (cmdLine) lines.push(cmdLine)
  }

  return lines.join('\r\n') + '\r\n'
}

function buildCommandLine(cmd: { id: string; command: string; params: Record<string, unknown> }): string {
  const { command, params, id } = cmd
  const cmdId = id.replace(/-/g, '').slice(0, 8)

  switch (command) {
    case 'ADD_USER': {
      const p = params as Record<string, string>
      return `C:${cmdId}:DATA UPDATE\tUserInfo\tPIN=${p.pin}\tName=${p.name}\tPri=${p.privilege ?? '0'}\tPasswd=\tCard=${p.card ?? ''}\tGrp=1\tTZ=1\tVerify=0\tViceCard=`
    }
    case 'DELETE_USER': {
      const p = params as Record<string, string>
      return `C:${cmdId}:DATA DELETE\tUserInfo\tPIN=${p.pin}`
    }
    case 'ENROLL_FP': {
      const p = params as Record<string, string>
      return `C:${cmdId}:ENROLL_BIO\tPIN=${p.pin}\tType=1\tFID=${p.finger_id ?? '0'}\tSave=1`
    }
    case 'ENROLL_FACE': {
      const p = params as Record<string, string>
      return `C:${cmdId}:ENROLL_BIO\tPIN=${p.pin}\tType=9\tFID=0\tSave=1`
    }
    case 'DELETE_FP': {
      const p = params as Record<string, string>
      return `C:${cmdId}:DATA DELETE\tFPTemplate\tPIN=${p.pin}\tFID=${p.finger_id ?? ''}`
    }
    case 'PUSH_FP_TEMPLATE': {
      const p = params as Record<string, string>
      return `C:${cmdId}:DATA UPDATE\tFPTemplate\tPIN=${p.pin}\tFID=${p.finger_id}\tValid=1\tTMP=${p.template}`
    }
    case 'SYNC_TIME':
      return `C:${cmdId}:SET OPTION\tDateTime=${new Date().toISOString().slice(0, 19).replace('T', ' ')}`
    case 'REBOOT':
      return `C:${cmdId}:SET OPTION\tReboot=1`
    case 'GET_INFO':
      return `C:${cmdId}:GET OPTION\t~SN,FirmVer,Language,PushProtVer,PushOptionsFlag`
    case 'QUERY_USERS':
      return `C:${cmdId}:DATA QUERY\tUserInfo`
    case 'CLEAR_LOGS':
      return `C:${cmdId}:DATA CLEAR\tATTLOG`
    default:
      return ''
  }
}
