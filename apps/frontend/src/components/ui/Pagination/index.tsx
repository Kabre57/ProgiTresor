import BasePagination from './Pagination'
import type { PaginationProps as BasePaginationProps } from './Pagination'

export interface PaginationProps extends Omit<BasePaginationProps, 'onChange' | 'total'> {
    total?: number
    totalCount?: number
    onChange?: (page: number) => void
    onPageChange?: (page: number) => void
    onPageSizeChange?: (size: number) => void
}

export const Pagination = ({
    total,
    totalCount,
    onChange,
    onPageChange,
    onPageSizeChange,
    ...props
}: PaginationProps) => {
    return (
        <BasePagination
            total={total ?? totalCount}
            onChange={onChange ?? onPageChange}
            {...props}
        />
    )
}

export default Pagination
