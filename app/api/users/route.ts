import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { z } from 'zod'

const UserSchema = z.object({
  employee_code: z.string().min(1).max(50),
  full_name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.enum(['ADMIN','MANAGER','USER']).default('USER'),
})

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const dept = searchParams.get('department')
  const search = searchParams.get('search')

  let query = supabase.from('users').select('*').order('full_name')
  if (dept) query = query.eq('department', dept)
  if (search) query = query.ilike('full_name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const parsed = UserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase.from('users').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
