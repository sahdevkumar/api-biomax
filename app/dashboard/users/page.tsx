'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { User, Device } from '@/types'

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Operations', 'Sales', 'Management', 'Security']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [enrollTarget, setEnrollTarget] = useState<User | null>(null)
  const [form, setForm] = useState({ employee_code: '', full_name: '', email: '', department: '', phone: '', role: 'USER' as const })
  const [enrollForm, setEnrollForm] = useState({ device_id: '', enroll_type: 'ENROLL_FP', finger_id: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [uRes, dRes] = await Promise.all([
      fetch(`/api/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
      fetch('/api/devices'),
    ])
    if (uRes.ok) setUsers(await uRes.json())
    if (dRes.ok) setDevices(await dRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  const handleAdd = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(JSON.stringify(d.error?.fieldErrors ?? d.error)); return }
      setShowAdd(false)
      setForm({ employee_code: '', full_name: '', email: '', department: '', phone: '', role: 'USER' })
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    load()
  }

  const handleEnroll = async () => {
    if (!enrollTarget || !enrollForm.device_id) { setError('Select a device'); return }
    setSaving(true); setError('')
    try {
      const device = devices.find(d => d.id === enrollForm.device_id)
      if (!device) { setError('Device not found'); return }

      // First add user to device
      const addRes = await fetch(`/api/devices/${enrollForm.device_id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'ADD_USER',
          params: { pin: enrollTarget.employee_code, name: enrollTarget.full_name },
        }),
      })
      if (!addRes.ok) { const d = await addRes.json(); setError(d.error || 'Failed to queue ADD_USER'); return }

      // Then queue enrollment
      if (enrollForm.enroll_type !== 'ADD_ONLY') {
        const enrollRes = await fetch(`/api/devices/${enrollForm.device_id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: enrollForm.enroll_type,
            params: { pin: enrollTarget.employee_code, finger_id: enrollForm.finger_id },
          }),
        })
        if (!enrollRes.ok) { const d = await enrollRes.json(); setError(d.error || 'Failed to queue enrollment'); return }
      }

      setEnrollTarget(null)
      setEnrollForm({ device_id: '', enroll_type: 'ENROLL_FP', finger_id: '0' })
      alert('Commands queued — device will execute on next heartbeat (~30s)')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Employee records and device enrollment</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add user</Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Add employee</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee code / PIN *</label>
                <Input placeholder="e.g. EMP001" value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                <Input placeholder="e.g. Priya Sharma" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <Input type="email" placeholder="priya@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <Select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}>
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Add user'}</Button>
              <Button variant="secondary" onClick={() => { setShowAdd(false); setError('') }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {enrollTarget && (
        <Card className="mb-6 border-brand-100">
          <CardHeader><CardTitle>Enroll on device — {enrollTarget.full_name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Device *</label>
                <Select value={enrollForm.device_id} onChange={e => setEnrollForm(f => ({ ...f, device_id: e.target.value }))}>
                  <option value="">Select device</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Biometric type</label>
                <Select value={enrollForm.enroll_type} onChange={e => setEnrollForm(f => ({ ...f, enroll_type: e.target.value }))}>
                  <option value="ADD_ONLY">Add user only (no biometric)</option>
                  <option value="ENROLL_FP">Fingerprint</option>
                  <option value="ENROLL_FACE">Face</option>
                </Select>
              </div>
              {enrollForm.enroll_type === 'ENROLL_FP' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Finger (0=right thumb)</label>
                  <Select value={enrollForm.finger_id} onChange={e => setEnrollForm(f => ({ ...f, finger_id: e.target.value }))}>
                    {[0,1,2,3,4,5,6,7,8,9].map(i => <option key={i} value={i.toString()}>Finger {i}</option>)}
                  </Select>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400">Commands will be queued and executed on the device's next heartbeat (~30 seconds).</p>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleEnroll} disabled={saving}>{saving ? 'Queuing…' : 'Queue enrollment'}</Button>
              <Button variant="secondary" onClick={() => { setEnrollTarget(null); setError('') }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading users…</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-xs text-gray-400">{user.employee_code}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      <div>{user.email ?? '—'}</div>
                      <div>{user.phone ?? ''}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{user.department ?? '—'}</td>
                    <td className="px-6 py-3">
                      <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'MANAGER' ? 'warning' : 'gray'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setEnrollTarget(user)}>Enroll</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id, user.full_name)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
