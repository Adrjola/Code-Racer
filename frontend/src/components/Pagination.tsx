import Button from './Button';

type PaginationProps = {
  onPageChange: (page: number) => void;
  page: number;
  totalElements: number;
  totalPages: number;
};

export default function Pagination({
  onPageChange,
  page,
  totalElements,
  totalPages,
}: PaginationProps) {
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="font-mono text-xs text-text-muted">
        Page {Math.min(page + 1, totalPages)} of {totalPages} - {totalElements}{' '}
        total
      </p>
      <div className="flex gap-2">
        <Button
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
          variant="ghost"
        >
          Previous
        </Button>
        <Button
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
          variant="ghost"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
