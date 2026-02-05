/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContentHeader from '@/components/adminlte/ContentHeader';

describe('ContentHeader', () => {
  it('renders title', () => {
    render(<ContentHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    render(
      <ContentHeader
        title="Orders"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Orders', active: true },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders empty breadcrumb list when not provided', () => {
    render(<ContentHeader title="Settings" />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('list').children).toHaveLength(0);
  });
});
