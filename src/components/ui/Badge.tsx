export function Badge({
  children,
  color = 'blue',
}: {
  children: React.ReactNode
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'gray' | 'amber' | 'red'
}) {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    green: 'bg-green-50 text-green-700 border border-green-100',
    orange: 'bg-orange-50 text-orange-600 border border-orange-100',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100',
    gray: 'bg-gray-100 text-gray-600 border border-gray-200',
    red: 'bg-red-50 text-red-600 border border-red-100',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  )
}
