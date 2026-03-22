import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const params = new URLSearchParams(body)
  const cmdId = params.get('ID') || ''
  const returnCode = params.get('Return') || '-1'
  const cmdResult = params.get('CMD') || ''
  const sn = new URL(request.url).searchParams.get('SN') || ''

  // Map short command ID back to UUID prefix
  if (cmdId) {
    const { data: commands } = await supabase
      .from('device_commands')
      .select('id')
      .eq('status', 'SENT')
      .ilike('id', `${cmdId.padStart(8, '0')}%`)
      .limit(1)

    if (commands && commands.length > 0) {
      await supabase
        .from('device_commands')
        .update({
          status: returnCode === '0' ? 'SUCCESS' : 'FAILED',
          result: { return_code: returnCode, cmd_result: cmdResult },
          executed_at: new Date().toISOString(),
        })
        .eq('id', commands[0].id)
    }
  }

  return new NextResponse('OK', { status: 200 })
}
