import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatTime(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function timeSince(date: string | null): string {
  if (!date) return 'never'
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function parseADMSRecord(line: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = line.trim().split('\t')
  if (parts.length >= 2) {
    result.pin = parts[0]
    result.time = parts[1]
    result.status = parts[2] || '0'
    result.verify = parts[3] || '0'
    result.workcode = parts[4] || '0'
  }
  return result
}

export function verifyModeToLabel(mode: string): string {
  const map: Record<string, string> = {
    '0': 'PASSWORD', '1': 'FINGERPRINT', '2': 'CARD',
    '3': 'FINGERPRINT', '4': 'PASSWORD', '5': 'FACE',
    '6': 'FACE', '15': 'FACE+FINGERPRINT',
  }
  return map[mode] || 'UNKNOWN'
}

export function statusToRecordType(status: string): string {
  const map: Record<string, string> = {
    '0': 'CHECK_IN', '1': 'CHECK_OUT', '2': 'BREAK_OUT',
    '3': 'BREAK_IN', '4': 'OVERTIME_IN', '5': 'OVERTIME_OUT',
  }
  return map[status] || 'CHECK_IN'
}
