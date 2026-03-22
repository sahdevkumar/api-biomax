'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Device } from '@/types'

const RECORD_TYPE_VARIANT: Record<string, 'success' | 'gray' | 'warning'> = {
  CHECK_IN: 'success', CHECK_OUT: 'gray',
  BREAK_OUT: 'warning', BREAK_IN: 'warning',
  OVERTIME_IN: 'success', OVERTIME_OUT: 'gray',
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<any[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    device_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    limit: '200',
  })

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.device_id) params.set('device_id', filters.device_id)
    if (filters.start_date) params.set('start_date', filters.start_date)
    if (filters.end_date) params.set('end_date', filters.end_date)
    params.set('limit', filters.limit)
    const res = await fetch(`/api/attendance?${params}`)
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }

  const loadDevices = async () => {
    const res = await fetch('/api/devices')
    if (res.ok) setDevices(await res.json())
  }

  useEffect(() => { loadDevices() }, [])
  useEffect(() => { load() }, [])

  const exportCSV = () => {
    const rows = [
      ['Employee', 'Code', 'Device', 'Type', 'Verify', 'Punch time'],
      ...logs.map(l => [
        l.users?.full_name ?? `UID ${l.device_uid}`,
        l.users?.employee_code ?? '',
        l.devices?.name ?? '',
        l.record_type,
        l.verify_mode,
        l.punch_time,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `attendance_${filters.start_date}_${filters.end_date}.csv`
    a.click()
  }

  const checkInCount = logs.filter(l => l.record_type === 'CHECK_IN').length
  const checkOutCount = logs.filter(l => l.record_type === 'CHECK_OUT').length
  const uniqueEmployees = new Set(logs.map(l => l.user_id).filter(Boolean)).size

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Punch records from all devices</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={logs.length === 0}>Export CSV</Button>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <Input type="date" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} className="w-40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <Input type="date" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} className="w-40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Device</label>
              <Select value={filters.device_id} onChange={e => setFilters(f => ({ ...f, device_id: e.target.value }))} className="w-44">
                <option value="">All devices</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
              <Select value={filters.limit} onChange={e => setFilters(f => ({ ...f, limit: e.target.value }))} className="w-28">
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </Select>
            </div>
            <Button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Apply'}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total records</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Employees present</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Check-in / out</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{checkInCount} / {checkOutCount}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Verify mode</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Punch time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-gray-900">{log.users?.full_name ?? `Device UID ${log.device_uid}`}</div>
                    <div className="text-xs text-gray-400">{log.users?.employee_code ?? ''}{log.users?.department ? ` · ${log.users.department}` : ''}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-xs">{log.devices?.name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={RECORD_TYPE_VARIANT[log.record_type] ?? 'gray'}>{log.record_type}</Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{log.verify_mode}</td>
                  <td className="px-6 py-3 text-gray-700 tabular-nums text-xs">{formatDate(log.punch_time)}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No records for this period</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
