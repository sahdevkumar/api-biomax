'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Device, AttendanceLog, AppUser } from '@/lib/types'

// ─── Mini components ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color = status === 'ONLINE' ? '#48b58a' : status === 'ERROR' ? '#e05252' : '#5a6359'
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: color,
      boxShadow: status === 'ONLINE' ? `0 0 6px ${color}` : 'none',
      flexShrink: 0,
    }} />
  )
}

function Badge({ label, color = 'var(--text3)' }: { label: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 3,
      border: `1px solid ${color}`,
      color, fontSize: 11,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.03em',
    }}>{label}</span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      ...style,
    }}>{children}</div>
  )
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase' }}>
        {title}
      </span>
      {action}
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 300, color: accent ?? 'var(--text)', lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>}
    </Card>
  )
}

// ─── Command modal ────────────────────────────────────────────────────────────

function CommandModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const [cmd, setCmd] = useState('SYNC_TIME')
  const [params, setParams] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const commands = ['SYNC_TIME','REBOOT','GET_INFO','QUERY_USERS','ENROLL_FP','ENROLL_FACE','ADD_USER','DELETE_USER']

  async function submit() {
    setLoading(true)
    try {
      let parsedParams: Record<string,string> = {}
      if (params.trim()) {
        for (const pair of params.split(',')) {
          const [k,v] = pair.split('=')
          if (k && v) parsedParams[k.trim()] = v.trim()
        }
      }
      const res = await fetch('/api/devices/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: device.id, command: cmd, params: parsedParams }),
      })
      const data = await res.json()
      setResult(res.ok ? `Queued: ${data.command?.id?.slice(0,8)}` : `Error: ${JSON.stringify(data.error)}`)
    } catch (e) {
      setResult('Network error')
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 8, padding: 24, width: 440, maxWidth: '90vw',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>
          QUEUE COMMAND → {device.name ?? device.device_id}
        </div>

        <select value={cmd} onChange={e => setCmd(e.target.value)} style={inputStyle}>
          {commands.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ marginTop: 12, marginBottom: 4, fontSize: 11, color: 'var(--text3)' }}>
          Params (optional) — format: KEY=value, KEY2=value2
        </div>
        <input
          value={params}
          onChange={e => setParams(e.target.value)}
          placeholder="PIN=001, FID=0"
          style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />

        {result && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12, color: result.startsWith('Error') ? 'var(--danger)' : 'var(--accent)' }}>
            {result}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={submit} disabled={loading} style={btnStyle('#48b58a', '#0d2a1e')}>
            {loading ? 'Queuing…' : 'Queue command'}
          </button>
          <button onClick={onClose} style={btnStyle('var(--border2)', 'var(--bg3)')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
  borderRadius: 4, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
}
const btnStyle = (border: string, bg: string): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 4, border: `1px solid ${border}`,
  background: bg, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)',
})

// ─── Add user modal ───────────────────────────────────────────────────────────

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ employee_code: '', full_name: '', email: '', department: '', role: 'USER' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setLoading(true); setErr(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setErr(JSON.stringify(data.error)); setLoading(false); return }
    onCreated(); onClose()
  }

  const field = (k: keyof typeof form, label: string, placeholder?: string) => (
    <div key={k} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        placeholder={placeholder} style={inputStyle} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: 24, width: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', marginBottom: 16 }}>NEW EMPLOYEE</div>
        {field('employee_code', 'Employee code', 'EMP001')}
        {field('full_name', 'Full name', 'Arjun Sharma')}
        {field('email', 'Email', 'arjun@company.com')}
        {field('department', 'Department', 'Engineering')}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Role</div>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
            {['USER','MANAGER','ADMIN'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit} disabled={loading} style={btnStyle('#48b58a', '#0d2a1e')}>
            {loading ? 'Creating…' : 'Create employee'}
          </button>
          <button onClick={onClose} style={btnStyle('var(--border2)', 'var(--bg3)')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState<'overview'|'devices'|'users'|'attendance'>('overview')
  const [devices,    setDevices]    = useState<Device[]>([])
  const [users,      setUsers]      = useState<AppUser[]>([])
  const [attendance, setAttendance] = useState<AttendanceLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [cmdDevice,  setCmdDevice]  = useState<Device | null>(null)
  const [addUser,    setAddUser]    = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [devRes, userRes, attRes] = await Promise.all([
      fetch('/api/devices'),
      fetch('/api/users'),
      fetch('/api/attendance?limit=50'),
    ])
    if (devRes.ok)  setDevices(await devRes.json())
    if (userRes.ok) setUsers(await userRes.json())
    if (attRes.ok)  setAttendance(await attRes.json())
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime subscription for live punches
  useEffect(() => {
    const channel = supabase
      .channel('live-attendance')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, payload => {
        setAttendance(prev => [payload.new as AttendanceLog, ...prev].slice(0, 50))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices' }, payload => {
        setDevices(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new as Device } : d))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const online  = devices.filter(d => d.status === 'ONLINE').length
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayPunches = attendance.filter(a => new Date(a.punch_time) >= todayStart).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Top nav */}
      <header style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center', height: 52, gap: 24,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 13, color: 'var(--accent)', letterSpacing: '0.05em', flexShrink: 0 }}>
          BIOMAX<span style={{ color: 'var(--text3)' }}>/</span>CLOUD
        </div>
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {(['overview','devices','users','attendance'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 4, border: 'none',
              background: tab === t ? 'var(--bg3)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text3)',
              fontSize: 13, textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}>{t}</button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
            {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={fetchAll} style={{
            padding: '5px 12px', borderRadius: 4, border: '1px solid var(--border2)',
            background: 'transparent', color: 'var(--text2)', fontSize: 12,
          }}>↻ Refresh</button>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            LOADING…
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {!loading && tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              <StatCard label="Devices online"   value={`${online} / ${devices.length}`}  accent="var(--accent)" />
              <StatCard label="Total employees"  value={users.length} />
              <StatCard label="Punches today"    value={todayPunches} accent="var(--info)" />
              <StatCard label="Pending commands" value="—" sub="check devices tab" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Device status */}
              <Card>
                <CardHeader title="Device status" />
                <div style={{ padding: '8px 0' }}>
                  {devices.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <StatusDot status={d.status} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{d.name ?? d.device_id}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{d.location ?? '—'}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                        {d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  ))}
                  {devices.length === 0 && <div style={{ padding: '16px', color: 'var(--text3)', fontSize: 12 }}>No devices registered yet.</div>}
                </div>
              </Card>

              {/* Live feed */}
              <Card>
                <CardHeader title="Live punch feed" />
                <div style={{ padding: '8px 0', maxHeight: 320, overflowY: 'auto' }}>
                  {attendance.slice(0, 20).map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{(a as any).user?.full_name ?? `UID:${a.device_uid}`}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(a as any).device?.name ?? '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Badge label={a.record_type} color={a.record_type === 'CHECK_IN' ? 'var(--accent)' : 'var(--text3)'} />
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                          {new Date(a.punch_time).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {attendance.length === 0 && <div style={{ padding: '16px', color: 'var(--text3)', fontSize: 12 }}>No attendance records yet.</div>}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── DEVICES ── */}
        {!loading && tab === 'devices' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 400 }}>Devices <span style={{ color: 'var(--text3)', fontSize: 13 }}>({devices.length})</span></h2>
            </div>
            <Card>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Status','Device ID','Name','Location','Last seen','Firmware','Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontWeight: 400, letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px' }}><StatusDot status={d.status} /></td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)' }}>{d.device_id}</td>
                      <td style={{ padding: '12px 16px' }}>{d.name ?? <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{d.location ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                        {d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
                        {d.firmware_version ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => setCmdDevice(d)} style={{
                          padding: '4px 10px', borderRadius: 3,
                          border: '1px solid var(--border2)',
                          background: 'transparent', color: 'var(--text2)', fontSize: 12,
                        }}>Send command</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {devices.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 8 }}>NO DEVICES</div>
                  <div style={{ fontSize: 12 }}>Configure your BioMax device with server address and port 443, then it will appear here automatically on first heartbeat.</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── USERS ── */}
        {!loading && tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 400 }}>Employees <span style={{ color: 'var(--text3)', fontSize: 13 }}>({users.length})</span></h2>
              <button onClick={() => setAddUser(true)} style={{
                padding: '7px 16px', borderRadius: 4,
                border: '1px solid var(--accent)', background: 'rgba(72,181,138,0.08)',
                color: 'var(--accent)', fontSize: 13,
              }}>+ New employee</button>
            </div>
            <Card>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Code','Name','Department','Email','Role','Enrolled on'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)' }}>{u.employee_code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{u.department ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text2)', fontSize: 12 }}>{u.email ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}><Badge label={u.role} color={u.role === 'ADMIN' ? 'var(--danger)' : u.role === 'MANAGER' ? 'var(--warn)' : 'var(--text3)'} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {!loading && tab === 'attendance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 400 }}>Attendance log <span style={{ color: 'var(--text3)', fontSize: 13 }}>last 50</span></h2>
              <Badge label="LIVE" color="var(--accent)" />
            </div>
            <Card>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Time','Employee','Department','Device','Type','Verify','Temp'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {new Date(a.punch_time).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 500 }}>{(a as any).user?.full_name ?? `UID:${a.device_uid}`}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text2)' }}>{(a as any).user?.department ?? '—'}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text2)' }}>{(a as any).device?.name ?? '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge label={a.record_type} color={a.record_type === 'CHECK_IN' ? 'var(--accent)' : a.record_type === 'CHECK_OUT' ? 'var(--info)' : 'var(--text3)'} />
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text3)' }}>{a.verify_mode}</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: a.temperature && a.temperature > 37.5 ? 'var(--danger)' : 'var(--text2)' }}>
                        {a.temperature ? `${a.temperature}°C` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  NO RECORDS YET — WAITING FOR DEVICE PUSH
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Modals */}
      {cmdDevice && <CommandModal device={cmdDevice} onClose={() => setCmdDevice(null)} />}
      {addUser   && <AddUserModal onClose={() => setAddUser(false)} onCreated={fetchAll} />}
    </div>
  )
}
