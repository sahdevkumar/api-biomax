import { createServiceClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/dashboard/device-status-dot'
import { formatDate } from '@/lib/utils'

export const revalidate = 10

async function getStats() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [devices, users, todayPunches, pendingCmds, recentPunches] = await Promise.all([
    supabase.from('devices').select('id, status'),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('attendance_logs').select('id', { count: 'exact', head: true }).gte('punch_time', today),
    supabase.from('device_commands').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('attendance_logs')
      .select('*, users(full_name, employee_code), devices(name)')
      .order('punch_time', { ascending: false })
      .limit(8),
  ])

  const onlineDevices = devices.data?.filter(d => d.status === 'ONLINE').length ?? 0
  return {
    totalDevices: devices.data?.length ?? 0,
    onlineDevices,
    totalUsers: users.count ?? 0,
    todayPunches: todayPunches.count ?? 0,
    pendingCommands: pendingCmds.count ?? 0,
    recentPunches: recentPunches.data ?? [],
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time attendance and device status</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Devices" value={`${stats.onlineDevices}/${stats.totalDevices}`} subtitle="online" accent="green" />
        <StatCard title="Users" value={stats.totalUsers} subtitle="enrolled" accent="blue" />
        <StatCard title="Today's punches" value={stats.todayPunches} subtitle={new Date().toLocaleDateString('en-IN')} accent="default" />
        <StatCard title="Pending commands" value={stats.pendingCommands} subtitle="queued" accent={stats.pendingCommands > 0 ? 'amber' : 'default'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent attendance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Verify</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentPunches.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-gray-900">{log.users?.full_name ?? `UID ${log.device_uid}`}</div>
                    <div className="text-xs text-gray-400">{log.users?.employee_code ?? '—'}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{log.devices?.name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge variant={log.record_type === 'CHECK_IN' ? 'success' : 'gray'}>{log.record_type}</Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{log.verify_mode}</td>
                  <td className="px-6 py-3 text-gray-600 tabular-nums">{formatDate(log.punch_time)}</td>
                </tr>
              ))}
              {stats.recentPunches.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No attendance records yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
