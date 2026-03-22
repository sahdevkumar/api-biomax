export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR'
export type VerifyMode = 'FINGERPRINT' | 'FACE' | 'CARD' | 'PASSWORD' | 'FACE+FINGERPRINT'
export type RecordType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT'
export type CommandStatus = 'PENDING' | 'SENT' | 'SUCCESS' | 'FAILED'
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER'

export interface Device {
  id: string
  device_id: string
  name: string
  ip_address: string | null
  location: string | null
  status: DeviceStatus
  last_seen: string | null
  firmware_version: string | null
  serial_number: string | null
  max_users: number
  max_fingerprints: number
  max_faces: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  employee_code: string
  full_name: string
  email: string | null
  department: string | null
  phone: string | null
  role: UserRole
  photo_url: string | null
  created_at: string
}

export interface DeviceUser {
  id: string
  device_id: string
  user_id: string
  device_uid: number
  fingerprint_count: number
  face_enrolled: boolean
  card_number: string | null
  enrolled_at: string
  last_sync_at: string | null
  users?: User
  devices?: Device
}

export interface AttendanceLog {
  id: string
  device_id: string
  user_id: string | null
  device_uid: number
  punch_time: string
  record_type: RecordType
  verify_mode: VerifyMode
  temperature: number | null
  mask_worn: boolean | null
  photo_url: string | null
  processed: boolean
  raw_data: Record<string, unknown> | null
  created_at: string
  users?: User
  devices?: Device
}

export interface DeviceCommand {
  id: string
  device_id: string
  command: string
  params: Record<string, unknown>
  status: CommandStatus
  result: Record<string, unknown> | null
  executed_at: string | null
  created_at: string
}

export interface DashboardStats {
  totalDevices: number
  onlineDevices: number
  totalUsers: number
  todayPunches: number
  pendingCommands: number
}
