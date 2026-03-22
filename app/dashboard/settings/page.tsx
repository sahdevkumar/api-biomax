'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { timeSince } from '@/lib/utils'

export default function SettingsPage() {
  const [commands, setCommands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const host = typeof window !== 'undefined' ? window.location.hostname : 'your-app.vercel.app'

  const loadCommands = async () => {
    setLoading(true)
    const res = await fetch('/api/commands?limit=50')
    if (res.ok) setCommands(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadCommands() }, [])

  const statusVariant: Record<string, any> = {
    PENDING: 'warning', SENT: 'default', SUCCESS: 'success', FAILED: 'danger',
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings &amp; setup</h1>
        <p className="text-sm text-gray-500 mt-1">Device configuration and command history</p>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>ADMS server configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Configure each BioMax device with these settings via: <strong>Menu → COMM → Cloud Server Setting</strong>
          </p>
          <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Server address', host],
                  ['Server port', '443'],
                  ['HTTPS', 'Enable'],
                  ['Enable domain name', 'ON'],
                  ['Heartbeat endpoint', `/iclock/cdata`],
                  ['Command poll endpoint', `/iclock/getrequest`],
                  ['Command ACK endpoint', `/iclock/devicecmd`],
                  ['Heartbeat interval', '30 seconds (Delay=30)'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-gray-500 font-medium w-56 text-xs">{label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-800 bg-white">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader><CardTitle>Supported ADMS commands</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            {[
              { cmd: 'ADD_USER', desc: 'Add user to device', params: '{ pin, name }' },
              { cmd: 'DELETE_USER', desc: 'Remove user from device', params: '{ pin }' },
              { cmd: 'ENROLL_FP', desc: 'Trigger fingerprint enrollment on device screen', params: '{ pin, finger_id }' },
              { cmd: 'ENROLL_FACE', desc: 'Trigger face enrollment on device screen', params: '{ pin }' },
              { cmd: 'DELETE_FP', desc: 'Remove a fingerprint template', params: '{ pin, finger_id }' },
              { cmd: 'PUSH_FP_TEMPLATE', desc: 'Push stored template to device', params: '{ pin, finger_id, template }' },
              { cmd: 'SYNC_TIME', desc: 'Sync device clock to server time', params: '{}' },
              { cmd: 'REBOOT', desc: 'Restart the device', params: '{}' },
              { cmd: 'GET_INFO', desc: 'Fetch firmware version, serial number', params: '{}' },
              { cmd: 'QUERY_USERS', desc: 'Pull all enrolled users from device', params: '{}' },
              { cmd: 'CLEAR_LOGS', desc: 'Clear attendance logs on device', params: '{}' },
            ].map(({ cmd, desc, params }) => (
              <div key={cmd} className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded w-44 flex-shrink-0">{cmd}</code>
                <span className="text-gray-600 flex-1">{desc}</span>
                <code className="text-xs text-gray-400">{params}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Command history</CardTitle>
            <button onClick={loadCommands} className="text-xs text-brand-400 hover:text-brand-600">Refresh</button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Command</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Queued</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commands.map(cmd => (
                <tr key={cmd.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-600 text-xs">{cmd.devices?.name ?? cmd.device_id.slice(0, 8)}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-800">{cmd.command}</td>
                  <td className="px-6 py-3"><Badge variant={statusVariant[cmd.status]}>{cmd.status}</Badge></td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{timeSince(cmd.created_at)}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{cmd.executed_at ? timeSince(cmd.executed_at) : '—'}</td>
                </tr>
              ))}
              {!loading && commands.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">No commands yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
