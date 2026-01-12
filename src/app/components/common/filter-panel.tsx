/**
 * Filter Panel Components - Composable filter UI building blocks
 *
 * Usage:
 * <FilterPanel>
 *   <SearchInput
 *     value={search}
 *     onChange={setSearch}
 *     placeholder="Search..."
 *   />
 *   <FilterSelect
 *     value={status}
 *     onChange={setStatus}
 *     options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }]}
 *   />
 * </FilterPanel>
 */

import { Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * FilterPanel - Container for filter components
 */
interface FilterPanelProps {
  children: React.ReactNode
  className?: string
}

export function FilterPanel({ children, className }: FilterPanelProps) {
  return (
    <div
      className={cn(
        'bg-rc-bg-dark border border-rc-bg-light rounded-xl p-4',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row gap-4">{children}</div>
    </div>
  )
}

/**
 * SearchInput - Search input with icon
 */
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('flex-1 relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-rc-bg-light border border-rc-bg-light rounded-lg text-sm text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

/**
 * FilterSelect - Select dropdown for filtering
 */
interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  /** Show filter icon */
  showIcon?: boolean
  /** Label shown above the select */
  label?: string
  className?: string
}

export function FilterSelect({
  value,
  onChange,
  options,
  showIcon = false,
  label,
  className,
}: FilterSelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-rc-text-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {showIcon && (
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rc-text-muted" />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full py-2 bg-rc-bg-light border border-rc-bg-light rounded-lg text-sm text-rc-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
            showIcon ? 'pl-10 pr-8' : 'px-3'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

/**
 * FilterGroup - Wrapper for multiple filters in a row
 */
interface FilterGroupProps {
  children: React.ReactNode
  className?: string
}

export function FilterGroup({ children, className }: FilterGroupProps) {
  return (
    <div className={cn('flex gap-3 flex-wrap', className)}>{children}</div>
  )
}

/**
 * ActiveFilters - Display active filter badges
 */
interface ActiveFilter {
  key: string
  label: string
  value: string
  onClear: () => void
}

interface ActiveFiltersProps {
  filters: ActiveFilter[]
  className?: string
}

export function ActiveFilters({ filters, className }: ActiveFiltersProps) {
  const activeFilters = filters.filter((f) => f.value && f.value !== 'all')

  if (activeFilters.length === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-3 pt-3 border-t border-rc-bg-light',
        className
      )}
    >
      <span className="text-xs text-rc-text-muted">Active filters:</span>
      <div className="flex gap-2 flex-wrap">
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center px-2 py-1 rounded-md bg-rc-bg-light text-xs text-rc-text-light"
          >
            {filter.label}: {filter.value}
            <button
              onClick={filter.onClear}
              className="ml-1 hover:text-rc-text"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

export default FilterPanel
