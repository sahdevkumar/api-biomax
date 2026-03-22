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
  const stamp = parseInt(searchParams.get('Stamp') || '0')

  if (!sn) {
    return new NextResponse('ERROR', { status: 400 })
  }

  // Upsert device as online
  const { data: device } = await supabase
    .from('devices')
    .upsert(
      { device_id: sn, status: 'ONLINE', last_seen: new Date().toISOString() },
      { onConflict: 'device_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  // Fetch pending commands for this device
  const { data: commands } = await supabase
    .from('device_commands')
    .select('id, command, params')
    .eq('device_id', device?.id ?? '')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(5)

  // Mark commands as SENT
  if (commands && commands.length > 0) {
    await supabase
      .from('device_commands')
      .update({ status: 'SENT' })
      .in('id', commands.map((c) => c.id))
  }

  const newStamp = Math.floor(Date.now() / 1000)
  const body = buildHeartbeatResponse(newStamp, commands || [])

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

  // Get device record
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('device_id', sn)
    .single()

  if (!device) return new NextResponse('ERROR: device not registered', { status: 404 })

  const body = await request.text()

  if (table === 'ATTLOG') {
    const punches = parseAttendanceLogs(body)
    if (punches.length > 0) {
      for (const punch of punches) {
        // Resolve user by employee_code (PIN)
        const { data: deviceUser } = await supabase
          .from('device_users')
          .select('user_id')
          .eq('device_id', device.id)
          .eq('device_uid', parseInt(punch.pin) || 0)
          .single()

        await supabase.from('attendance_logs').insert({
          device_id: device.id,
          user_id: deviceUser?.user_id ?? null,
          device_uid: parseInt(punch.pin) || 0,
          punch_time: new Date(punch.punch_time).toISOString(),
          record_type: punch.record_type,
          verify_mode: punch.verify_mode,
          raw_data: { pin: punch.pin, workcode: punch.workcode, raw: punch.raw },
          processed: false,
        })
      }
    }
    return new NextResponse('OK', { status: 200 })
  }

  if (table === 'OPERLOG') {
    const users = parseUserRecords(body)
    for (const u of users) {
      // Find or create user record
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('employee_code', u.pin)
        .single()

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
            {
              device_id: device.id,
              user_id: userId,
              device_uid: parseInt(u.pin) || 0,
              card_number: u.card || null,
              last_sync_at: new Date().toISOString(),
            },
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
        .select('id, user_id')
        .eq('device_id', device.id)
        .eq('device_uid', parseInt(tpl.pin) || 0)
        .single()

      if (deviceUser) {
        if (table === 'templatev10') {
          await supabase
            .from('device_users')
            .update({ fingerprint_count: parseInt(tpl.finger_id) + 1 })
            .eq('id', deviceUser.id)
        } else {
          await supabase
            .from('device_users')
            .update({ face_enrolled: true })
            .eq('id', deviceUser.id)
        }
      }
    }
    return new NextResponse('OK', { status: 200 })
  }

  return new NextResponse('OK', { status: 200 })
}
