import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildHeartbeatResponse } from '@/lib/adms'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sn = searchParams.get('SN') || ''

  if (!sn) return new NextResponse('ERROR', { status: 400 })

  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', sn)
    .single()

  if (!device) return new NextResponse('ERROR', { status: 404 })

  const { data: commands } = await supabase
    .from('device_commands')
    .select('id, command, params')
    .eq('device_id', device.id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(5)

  if (commands && commands.length > 0) {
    await supabase
      .from('device_commands')
      .update({ status: 'SENT' })
      .in('id', commands.map((c) => c.id))
  }

  if (!commands || commands.length === 0) {
    return new NextResponse('OK', { status: 200 })
  }

  const stamp = Math.floor(Date.now() / 1000)
  const body = buildHeartbeatResponse(stamp, commands)

  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
