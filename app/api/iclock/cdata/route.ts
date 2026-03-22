import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseAttendanceLogs, parseUserRecords, parseTemplates, buildHeartbeatResponse } from '@/lib/adms'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sn = searchParams.get('SN') || searchParams.get('sn') || ''

  if (!sn) {
    return new NextResponse('ERROR', { status: 400 })
  }

  // Check if device already exists
  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', sn)
    .maybeSingle()

  let deviceId: string | null = existing?.id ?? null

  if (existing) {
    // Already registered — just update heartbeat
    await supabase
      .from('devices')
      .update({ status: 'ONLINE', last_seen: new Date().toISOString() })
      .eq('device_id', sn)
  } else {
    // Auto-register on first heartbeat — use SN as name (user can rename later)
    const { data: inserted, error: insertErr } = await supabase
      .from('devices')
      .insert({
        device_id: sn,
        name: `Device ${sn}`,
        status: 'ONLINE',
        last_seen: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('[cdata] auto-register failed:', insertErr.message)
    } else {
      deviceId = inserted?.id ?? null
      console.log('[cdata] auto-registered device:', sn, deviceId)
    }
  }

  // Fetch pending commands
  const { data: commands } = deviceId
    ? await supabase
        .from('device_commands')
        .select('id, command, params')
        .eq('device_id', deviceId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(5)
    : { data: [] }

  // Mark as SENT
  if (commands && commands.length > 0) {
    await supabase
      .from('device_commands')
      .update({ status: 'SENT' })
      .in('id', commands.map((c) => c.id))
  }

  const stamp = Math.floor(Date.now() / 1000)
  const body = buildHeartbeatResponse(stamp, commands || [])

  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sn = searchParams.get('SN') || searchParams.get('sn') || ''
  const table = searchParams.get('table') || ''

  if (!sn) return new NextResponse('ERROR', { status: 400 })

  // Auto-register if needed (same logic as GET)
  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', sn)
    .maybeSingle()

  let deviceId: string | null = existing?.id ?? null

  if (!existing) {
    const { data: inserted } = await supabase
      .from('devices')
      .insert({ device_id: sn, name: `Device ${sn}`, status: 'ONLINE', last_seen: new Date().toISOString() })
      .select('id')
      .single()
    deviceId = inserted?.id ?? null
  } else {
    await supabase.from('devices').update({ status: 'ONLINE', last_seen: new Date().toISOString() }).eq('device_id', sn)
  }

  if (!deviceId) return new NextResponse('ERROR: could not resolve device', { status: 500 })

  const body = await request.text()

  if (table === 'ATTLOG') {
    const punches = parseAttendanceLogs(body)
    for (const punch of punches) {
      const { data: deviceUser } = await supabase
        .from('device_users')
        .select('user_id')
        .eq('device_id', deviceId)
        .eq('device_uid', parseInt(punch.pin) || 0)
        .maybeSingle()

      await supabase.from('attendance_logs').insert({
        device_id: deviceId,
        user_id: deviceUser?.user_id ?? null,
        device_uid: parseInt(punch.pin) || 0,
        punch_time: new Date(punch.punch_time).toISOString(),
        record_type: punch.record_type,
        verify_mode: punch.verify_mode,
        raw_data: { pin: punch.pin, workcode: punch.workcode, raw: punch.raw },
        processed: false,
      })
    }
    return new NextResponse('OK', { status: 200 })
  }

  if (table === 'OPERLOG') {
    const users = parseUserRecords(body)
    for (const u of users) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('employee_code', u.pin)
        .maybeSingle()

      let userId = existingUser?.id
      if (!userId) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ employee_code: u.pin, full_name: u.name || `User ${u.pin}`, role: 'USER' })
          .select('id')
          .single()
        userId = newUser?.id
      }

      if (userId) {
        await supabase
          .from('device_users')
          .upsert(
            { device_id: deviceId, user_id: userId, device_uid: parseInt(u.pin) || 0, card_number: u.card || null, last_sync_at: new Date().toISOString() },
            { onConflict: 'device_id,device_uid' }
          )
      }
    }
    return new NextResponse('OK', { status: 200 })
  }

  if (table === 'templatev10' || table === 'FACE') {
    const templates = parseTemplates(body)
    for (const tpl of templates) {
      const { data: deviceUser } = await supabase
        .from('device_users')
        .select('id')
        .eq('device_id', deviceId)
        .eq('device_uid', parseInt(tpl.pin) || 0)
        .maybeSingle()

      if (deviceUser) {
        await supabase
          .from('device_users')
          .update(table === 'templatev10' ? { fingerprint_count: parseInt(tpl.finger_id) + 1 } : { face_enrolled: true })
          .eq('id', deviceUser.id)
      }
    }
    return new NextResponse('OK', { status: 200 })
  }

  return new NextResponse('OK', { status: 200 })
}
