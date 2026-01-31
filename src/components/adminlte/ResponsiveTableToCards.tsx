/**
 * Responsive Table to Cards Component
 *
 * Shows data as table on desktop and Bootstrap styled cards on mobile.
 * Mobile-first approach with touch-friendly interactions.
 */

import React from "react";

export type ResponsiveColumn<T> = {
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
  thClassName?: string;
  tdClassName?: string;
};

type ResponsiveTableToCardsProps<T> = {
  items: T[];
  columns: Array<ResponsiveColumn<T>>;
  renderMobileCard: (item: T) => React.ReactNode;
  getRowKey?: (item: T, index: number) => React.Key;
  emptyState?: React.ReactNode;
  tableClassName?: string;
  theadClassName?: string;
  mobileContainerClassName?: string;
  desktopContainerClassName?: string;
};

export function ResponsiveTableToCards<T>({
  items,
  columns,
  renderMobileCard,
  getRowKey,
  emptyState,
  tableClassName = "table table-striped table-hover text-nowrap mb-0",
  theadClassName = "table-light",
  mobileContainerClassName = "p-3",
  desktopContainerClassName = "",
}: ResponsiveTableToCardsProps<T>) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const keyFn = getRowKey ?? ((item: T, idx: number) => idx);

  // Empty state component with Bootstrap styling
  const emptyStateContent = emptyState ?? (
    <div className="text-center py-5 text-muted">
      <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
      <p className="mb-0">Tidak ada data.</p>
    </div>
  );

  return (
    <>
      {/* Mobile: Bootstrap Cards/List */}
      <div className={`d-md-none ${mobileContainerClassName}`}>
        {hasItems ? (
          <div className="d-flex flex-column gap-3">
            {items.map((it, idx) => (
              <div key={keyFn(it, idx)} className="card shadow-sm border-0">
                <div className="card-body p-3">
                  {renderMobileCard(it)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          emptyStateContent
        )}
      </div>

      {/* Desktop: Table with Bootstrap styling */}
      <div className={`d-none d-md-block ${desktopContainerClassName}`}>
        {hasItems ? (
          <div className="table-responsive">
            <table className={tableClassName}>
              <thead className={theadClassName}>
                <tr>
                  {columns.map((c, idx) => (
                    <th key={idx} className={c.thClassName}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={keyFn(it, idx)}>
                    {columns.map((c, cIdx) => (
                      <td key={cIdx} className={c.tdClassName}>
                        {c.render(it)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          emptyStateContent
        )}
      </div>
    </>
  );
}
