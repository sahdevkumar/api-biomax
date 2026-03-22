'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusDot } from '@/components/dashboard/device-status-dot'
import { timeSince, formatDate } from '@/lib/utils'
import type { Device } from '@/types'

const COMMANDS = [
  { value: 'SYNC_TIME', label: 'Sync time' },
  { value: 'REBOOT', label: 'Reboot device' },
  { value: 'GET_INFO', label: 'Get device info' },
  { value: 'QUERY_USERS', label: 'Query users' },
  { value: 'CLEAR_LOGS', label: 'Clear logs' },
]

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [cmdDevice, setCmdDevice] = useState<Device | null>(null)
  const [form, setForm] = useState({ device_id: '', name: '', ip_address: '', location: '' })
  const [cmdForm, setCmdForm] = useState({ command: 'SYNC_TIME', params: '{}' })
  const [saving, setSaving] = useState(false)
  const [cmdSending, setCmdSending] = useState(false)
  const [error, setError] = useState('')
  const [cmdError, setCmdError] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/devices')
    if (res.ok) setDevices(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error?.fieldErrors ? JSON.stringify(d.error.fieldErrors) : d.error); return }
      setShowAdd(false)
      setForm({ device_id: '', name: '', ip_address: '', location: '' })
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this device?')) return
    await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    load()
  }

  const handleCommand = async () => {
    if (!cmdDevice) return
    setCmdSending(true); setCmdError('')
    try {
      let params = {}
      try { params = JSON.parse(cmdForm.params) } catch { setCmdError('Invalid JSON in params'); return }
      const res = await fetch(`/api/devices/${cmdDevice.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdForm.command, params }),
      })
      if (!res.ok) { const d = await res.json(); setCmdError(d.error || 'Failed'); return }
      setCmdDevice(null)
      setCmdForm({ command: 'SYNC_TIME', params: '{}' })
    } finally { setCmdSending(false) }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Devices</h1>
          <p className="text-sm text-gray-500 mt-1">BioMax biometric devices connected via ADMS</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Register device</Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Register new device</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Serial number / Device ID *</label>
                <Input placeholder="e.g. BM30W001" value={form.device_id} onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display name *</label>
                <Input placeholder="e.g. Main entrance" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">IP address (optional)</label>
                <Input placeholder="192.168.1.100" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <Input placeholder="e.g. Head office, Floor 2" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Register'}</Button>
              <Button variant="secondary" onClick={() => { setShowAdd(false); setError('') }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cmdDevice && (
        <Card className="mb-6 border-brand-100">
          <CardHeader><CardTitle>Send command — {cmdDevice.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Command</label>
                <Select value={cmdForm.command} onChange={e => setCmdForm(f => ({ ...f, command: e.target.value }))}>
                  {COMMANDS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  <option value="ADD_USER">Add user</option>
                  <option value="DELETE_USER">Delete user</option>
                  <option value="ENROLL_FP">Trigger fingerprint enroll</option>
                  <option value="ENROLL_FACE">Trigger face enroll</option>
                  <option value="DELETE_FP">Delete fingerprint</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Params (JSON)</label>
                <Input value={cmdForm.params} onChange={e => setCmdForm(f => ({ ...f, params: e.target.value }))} placeholder='{"pin":"1"}' />
              </div>
            </div>
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <strong>Examples:</strong> ADD_USER: <code>{`{"pin":"5","name":"Alice"}`}</code> · ENROLL_FP: <code>{`{"pin":"5","finger_id":"0"}`}</code> · DELETE_USER: <code>{`{"pin":"5"}`}</code>
            </div>
            {cmdError && <p className="mt-2 text-xs text-red-600">{cmdError}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCommand} disabled={cmdSending}>{cmdSending ? 'Queuing…' : 'Queue command'}</Button>
              <Button variant="secondary" onClick={() => { setCmdDevice(null); setCmdError('') }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading devices…</div>
      ) : devices.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-gray-400 text-sm">No devices registered yet. Configure your BioMax device with server address: <strong>your-app.vercel.app</strong>, port: <strong>443</strong></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {devices.map(device => (
            <Card key={device.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusDot status={device.status} />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{device.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        SN: {device.device_id}
                        {device.ip_address && ` · ${device.ip_address}`}
                        {device.location && ` · ${device.location}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <Badge variant={device.status === 'ONLINE' ? 'success' : 'gray'}>{device.status}</Badge>
                      <div className="text-xs text-gray-400 mt-1">{device.last_seen ? timeSince(device.last_seen) : 'never seen'}</div>
                    </div>
                    {device.firmware_version && <div className="text-xs text-gray-400 hidden md:block">fw {device.firmware_version}</div>}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setCmdDevice(device)}>Command</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(device.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 border-amber-100 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Device setup instructions</p>
          <p className="text-xs text-amber-700">On your BioMax device: Menu → COMM → Cloud Server Setting</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-700">
            <span>Enable Domain Name: <strong>ON</strong></span>
            <span>Server Port: <strong>443</strong></span>
            <span>Server Address: <strong>your-app.vercel.app</strong></span>
            <span>HTTPS: <strong>Enable</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
