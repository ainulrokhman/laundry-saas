import React from 'react';

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
  tableClassName = 'table table-striped table-hover text-nowrap mb-0',
  theadClassName = 'table-light',
  mobileContainerClassName = 'p-3',
  desktopContainerClassName = '',
}: ResponsiveTableToCardsProps<T>) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const keyFn = getRowKey ?? ((item: T, idx: number) => idx);

  return (
    <>
      {/* Mobile: cards/list */}
      <div className={`d-md-none ${mobileContainerClassName}`}>
        {hasItems ? (
          <div className="vstack gap-2">
            {items.map((it, idx) => (
              <React.Fragment key={keyFn(it, idx)}>{renderMobileCard(it)}</React.Fragment>
            ))}
          </div>
        ) : (
          emptyState ?? <div className="text-muted text-center py-4">Tidak ada data.</div>
        )}
      </div>

      {/* Desktop: table */}
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
          <div className="text-muted text-center py-4">
            {emptyState ?? 'Tidak ada data.'}
          </div>
        )}
      </div>
    </>
  );
}

