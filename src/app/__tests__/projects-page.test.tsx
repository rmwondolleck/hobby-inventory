/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/features/projects/components/ProjectsListClient', () => ({
  ProjectsListClient: () => <div data-testid="projects-list-client" />,
}));

import ProjectsPage from '../projects/page';

describe('Projects page — theme class migration', () => {
  it('renders the Projects heading', () => {
    render(<ProjectsPage />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('uses text-foreground on h1 instead of text-gray-900', () => {
    const { container } = render(<ProjectsPage />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('text-foreground');
    expect(h1?.className).not.toContain('text-gray-900');
  });

  it('uses text-muted-foreground on subtitle instead of text-gray-500', () => {
    const { container } = render(<ProjectsPage />);
    const subtitle = container.querySelector('h1 + p');
    expect(subtitle?.className).toContain('text-muted-foreground');
    expect(subtitle?.className).not.toContain('text-gray-500');
  });

  it('renders the ProjectsListClient component', () => {
    render(<ProjectsPage />);
    expect(screen.getByTestId('projects-list-client')).toBeInTheDocument();
  });
});
