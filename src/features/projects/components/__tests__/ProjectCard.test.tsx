/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import type { ProjectListItem } from '../../types';

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const baseProject: ProjectListItem = {
  id: 'proj-1',
  name: 'Robot Arm',
  status: 'active',
  tags: ['robot', 'servo'],
  notes: 'Building a robotic arm',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  allocationCount: 3,
  allocationsByStatus: { in_use: 2, reserved: 1 },
};

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Robot Arm')).toBeInTheDocument();
  });

  it('links to the correct project detail URL', () => {
    render(<ProjectCard project={baseProject} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/proj-1');
  });

  it('renders the status badge with correct label', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders status badge for idea status', () => {
    render(<ProjectCard project={{ ...baseProject, status: 'idea' }} />);
    expect(screen.getByText('Idea')).toBeInTheDocument();
  });

  it('renders status badge for planned status', () => {
    render(<ProjectCard project={{ ...baseProject, status: 'planned' }} />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('renders status badge for deployed status', () => {
    render(<ProjectCard project={{ ...baseProject, status: 'deployed' }} />);
    expect(screen.getByText('Deployed')).toBeInTheDocument();
  });

  it('renders status badge for retired status', () => {
    render(<ProjectCard project={{ ...baseProject, status: 'retired' }} />);
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('renders project notes when provided', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Building a robotic arm')).toBeInTheDocument();
  });

  it('does not render notes section when notes is null', () => {
    render(<ProjectCard project={{ ...baseProject, notes: null }} />);
    expect(screen.queryByText('Building a robotic arm')).not.toBeInTheDocument();
  });

  it('renders tags as badges', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('robot')).toBeInTheDocument();
    expect(screen.getByText('servo')).toBeInTheDocument();
  });

  it('shows up to 4 tags and adds overflow badge for extras', () => {
    const projectWithManyTags = {
      ...baseProject,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    render(<ProjectCard project={projectWithManyTags} />);
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag4')).toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders allocation counts when allocationCount > 0', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('2 in use')).toBeInTheDocument();
    expect(screen.getByText('1 reserved')).toBeInTheDocument();
  });

  it('does not render allocation section when allocationCount is 0', () => {
    render(
      <ProjectCard
        project={{ ...baseProject, allocationCount: 0, allocationsByStatus: {} }}
      />
    );
    expect(screen.queryByText(/in use/)).not.toBeInTheDocument();
    expect(screen.queryByText(/reserved/)).not.toBeInTheDocument();
  });

  it('renders deployed allocation count when present', () => {
    render(
      <ProjectCard
        project={{
          ...baseProject,
          allocationsByStatus: { deployed: 3 },
        }}
      />
    );
    expect(screen.getByText('3 deployed')).toBeInTheDocument();
  });

  it('shows Archived badge for archived projects', () => {
    render(
      <ProjectCard
        project={{ ...baseProject, archivedAt: '2024-06-01T00:00:00Z' }}
      />
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('does not show Archived badge for non-archived projects', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('applies opacity class for archived projects', () => {
    const { container } = render(
      <ProjectCard
        project={{ ...baseProject, archivedAt: '2024-06-01T00:00:00Z' }}
      />
    );
    const link = container.firstChild as HTMLElement;
    expect(link.className).toContain('opacity-60');
  });

  it('does not apply opacity class for non-archived projects', () => {
    const { container } = render(<ProjectCard project={baseProject} />);
    const link = container.firstChild as HTMLElement;
    expect(link.className).not.toContain('opacity-60');
  });

  // --- Pin functionality ---

  it('does not render a pin button when onPin is not provided', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a pin button when onPin is provided', () => {
    render(<ProjectCard project={baseProject} onPin={jest.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('pin button has aria-label "Pin project" when not pinned', () => {
    render(<ProjectCard project={baseProject} isPinned={false} onPin={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Pin project' })).toBeInTheDocument();
  });

  it('pin button has aria-label "Unpin project" when pinned', () => {
    render(<ProjectCard project={baseProject} isPinned={true} onPin={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Unpin project' })).toBeInTheDocument();
  });

  it('calls onPin with project id when pin button is clicked', () => {
    const onPin = jest.fn();
    render(<ProjectCard project={baseProject} onPin={onPin} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPin).toHaveBeenCalledWith('proj-1');
  });

  it('clicking pin button does not follow the card link (stopPropagation)', () => {
    const onPin = jest.fn();
    render(<ProjectCard project={baseProject} onPin={onPin} />);
    const button = screen.getByRole('button');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');
    button.dispatchEvent(clickEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('defaults isPinned to false (pin button shows Pin project label)', () => {
    render(<ProjectCard project={baseProject} onPin={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Pin project' })).toBeInTheDocument();
  });

  it('pin button has low opacity class when not pinned', () => {
    render(<ProjectCard project={baseProject} isPinned={false} onPin={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('opacity-30');
  });

  it('pin button has full opacity class when pinned', () => {
    render(<ProjectCard project={baseProject} isPinned={true} onPin={jest.fn()} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('opacity-100');
    expect(button.className).not.toContain('opacity-30');
  });

  it('adds right margin to status column when onPin is provided', () => {
    const { container } = render(<ProjectCard project={baseProject} onPin={jest.fn()} />);
    const mrDiv = container.querySelector('.mr-6');
    expect(mrDiv).not.toBeNull();
  });

  it('does not add right margin to status column when onPin is not provided', () => {
    const { container } = render(<ProjectCard project={baseProject} />);
    expect(container.querySelector('.mr-6')).toBeNull();
  });
});
