/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectsPage from '../page';

jest.mock('@/features/projects/components/ProjectsListClient', () => ({
  ProjectsListClient: () => <div data-testid="projects-list-client" />,
}));

describe('ProjectsPage', () => {
  it('renders without crashing', () => {
    render(<ProjectsPage />);
  });

  it('renders the page heading "Projects"', () => {
    render(<ProjectsPage />);
    expect(screen.getByRole('heading', { name: /^projects$/i })).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<ProjectsPage />);
    expect(screen.getByText(/track where your parts are going/i)).toBeInTheDocument();
  });

  it('renders the ProjectsListClient component', () => {
    render(<ProjectsPage />);
    expect(screen.getByTestId('projects-list-client')).toBeInTheDocument();
  });
});
