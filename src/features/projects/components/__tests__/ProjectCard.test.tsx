/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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

  describe('theme classes (CSS variable substitution)', () => {
    it('uses bg-card on the card container instead of bg-white', () => {
      const { container } = render(<ProjectCard project={baseProject} />);
      const link = container.firstChild as HTMLElement;
      expect(link.className).toContain('bg-card');
      expect(link.className).not.toContain('bg-white');
    });

    it('uses text-foreground for project name instead of text-gray-900', () => {
      render(<ProjectCard project={baseProject} />);
      const heading = screen.getByText('Robot Arm');
      expect(heading.className).toContain('text-foreground');
      expect(heading.className).not.toContain('text-gray-900');
    });

    it('uses text-muted-foreground for notes instead of hardcoded gray', () => {
      render(<ProjectCard project={baseProject} />);
      const notes = screen.getByText('Building a robotic arm');
      expect(notes.className).toContain('text-muted-foreground');
      expect(notes.className).not.toContain('text-gray-600');
    });
  });
});
