/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Parts" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Parts');
  });

  it('renders title as an h1 element', () => {
    const { container } = render(<PageHeader title="Parts" />);
    expect(container.querySelector('h1')).toBeInTheDocument();
  });

  it('applies title styles', () => {
    const { container } = render(<PageHeader title="Parts" />);
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.className).toContain('text-2xl');
    expect(h1.className).toContain('font-bold');
  });

  it('renders string description when provided', () => {
    render(<PageHeader title="Parts" description="Browse and manage your parts catalog" />);
    expect(screen.getByText('Browse and manage your parts catalog')).toBeInTheDocument();
  });

  it('does not render a description paragraph when description is omitted', () => {
    const { container } = render(<PageHeader title="Parts" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders ReactNode description (e.g. code element)', () => {
    render(
      <PageHeader
        title="Location"
        description={<code data-testid="path-code">/workshop/shelf-a</code>}
      />
    );
    expect(screen.getByTestId('path-code')).toBeInTheDocument();
    expect(screen.getByTestId('path-code')).toHaveTextContent('/workshop/shelf-a');
  });

  it('wraps description in a paragraph element', () => {
    const { container } = render(<PageHeader title="Parts" description="desc" />);
    expect(container.querySelector('p')).toBeInTheDocument();
    expect(container.querySelector('p')?.textContent).toBe('desc');
  });

  it('renders actions slot when provided', () => {
    render(
      <PageHeader
        title="Locations"
        actions={<button>Print All Labels</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Print All Labels' })).toBeInTheDocument();
  });

  it('does not render an actions container when actions is omitted', () => {
    const { container } = render(<PageHeader title="Parts" />);
    // The wrapper div has flex layout; only the title div should be present, no shrink-0 div
    const wrapperDiv = container.firstChild as HTMLElement;
    expect(wrapperDiv.children).toHaveLength(1);
  });

  it('renders ReactNode actions (e.g. a link)', () => {
    render(
      <PageHeader
        title="Location Detail"
        actions={<a href="/locations">← Back</a>}
      />
    );
    expect(screen.getByRole('link', { name: '← Back' })).toBeInTheDocument();
  });

  it('renders both description and actions together', () => {
    render(
      <PageHeader
        title="Projects"
        description="Track your projects"
        actions={<button>New Project</button>}
      />
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Projects');
    expect(screen.getByText('Track your projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
  });

  it('applies layout classes to the wrapper', () => {
    const { container } = render(<PageHeader title="Test" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mb-6');
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('justify-between');
  });

  it('actions container has shrink-0 class', () => {
    const { container } = render(
      <PageHeader title="Test" actions={<span>action</span>} />
    );
    const wrapper = container.firstChild as HTMLElement;
    const actionsDiv = wrapper.children[1] as HTMLElement;
    expect(actionsDiv.className).toContain('shrink-0');
  });
});
