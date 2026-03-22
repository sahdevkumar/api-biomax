import { cn } from '@/lib/utils'

export function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full',
      status === 'ONLINE' ? 'bg-green-400' : status === 'ERROR' ? 'bg-red-400' : 'bg-gray-300'
    )} />
  )
}
