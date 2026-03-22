import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('device_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('device_commands')
    .select('*, devices(name, device_id)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (deviceId) query = query.eq('device_id', deviceId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
