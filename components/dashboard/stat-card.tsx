import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'default'
}

const accents = {
  green: 'border-l-green-400',
  blue: 'border-l-blue-400',
  amber: 'border-l-amber-400',
  red: 'border-l-red-400',
  default: 'border-l-brand-400',
}

export function StatCard({ title, value, subtitle, accent = 'default' }: StatCardProps) {
  return (
    <Card className={cn('border-l-4', accents[accent])}>
      <div className="px-5 py-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </Card>
  )
}
