import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id')
  const userId = searchParams.get('user_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('attendance_logs')
    .select('*, users(full_name, employee_code, department), devices(name, location)')
    .order('punch_time', { ascending: false })
    .limit(Math.min(limit, 500))

  if (deviceId) query = query.eq('device_id', deviceId)
  if (userId) query = query.eq('user_id', userId)
  if (startDate) query = query.gte('punch_time', startDate)
  if (endDate) query = query.lte('punch_time', endDate + 'T23:59:59')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
