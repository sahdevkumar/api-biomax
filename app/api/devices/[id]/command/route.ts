import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const CommandSchema = z.object({
  command: z.enum(['ADD_USER','DELETE_USER','ENROLL_FP','ENROLL_FACE','DELETE_FP','PUSH_FP_TEMPLATE','SYNC_TIME','REBOOT','GET_INFO','QUERY_USERS','CLEAR_LOGS']),
  params: z.record(z.unknown()).optional().default({}),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const body = await request.json()
  const parsed = CommandSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('device_commands')
    .insert({ device_id: params.id, command: parsed.data.command, params: parsed.data.params, status: 'PENDING' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
