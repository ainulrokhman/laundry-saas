/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveTableToCards } from '@/components/adminlte/ResponsiveTableToCards';

type Item = { id: string; name: string };

const columns = [
  { header: 'ID', render: (item: Item) => item.id },
  { header: 'Name', render: (item: Item) => item.name },
];

describe('ResponsiveTableToCards', () => {
  it('renders empty state when no items', () => {
    render(
      <ResponsiveTableToCards<Item>
        items={[]}
        columns={columns}
        renderMobileCard={(item) => <span>{item.name}</span>}
      />
    );
    expect(screen.getByText('Tidak ada data.')).toBeInTheDocument();
  });

  it('renders custom empty state when provided', () => {
    render(
      <ResponsiveTableToCards<Item>
        items={[]}
        columns={columns}
        renderMobileCard={(item) => <span>{item.name}</span>}
        emptyState={<p>No items yet</p>}
      />
    );
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders table headers and item data when items provided', () => {
    const items: Item[] = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' },
    ];
    render(
      <ResponsiveTableToCards<Item>
        items={items}
        columns={columns}
        renderMobileCard={(item) => <span>{item.name}</span>}
        getRowKey={(item) => item.id}
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
