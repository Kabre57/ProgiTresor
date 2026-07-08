import Skeleton from './Skeleton'
import classNames from 'classnames'

export type { SkeletonProps } from './Skeleton'
export { Skeleton }

interface TableRowSkeletonProps {
  columnsCount: number;
  rowsCount?: number;
}

export function TableRowSkeleton({
  columnsCount,
  rowsCount = 5,
}: TableRowSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowsCount }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-[var(--border)]">
          {Array.from({ length: columnsCount }).map((__, colIndex) => (
            <td key={colIndex} className="px-6 py-4">
              <Skeleton
                className={classNames(
                  'h-4 w-full',
                  colIndex === 0 && 'w-3/4',
                  colIndex === columnsCount - 1 && 'w-1/2'
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default Skeleton
