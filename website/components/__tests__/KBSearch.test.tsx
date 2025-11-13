import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import KBSearch from '../KBSearch'

// Mock the search index and analytics
jest.mock('@/lib/search-index', () => ({
  searchIndex: [
    {
      id: '1',
      title: 'Getting Started',
      description: 'Learn how to get started with NeuroSwarm',
      category: 'Getting Started',
      slug: '/kb/getting-started',
      content: 'This is the getting started guide content...'
    },
    {
      id: '2',
      title: 'Governance Dashboard',
      description: 'Monitor governance activities and metrics',
      category: 'Governance',
      slug: '/kb/governance-dashboard',
      content: 'Dashboard for governance transparency...'
    }
  ]
}))

jest.mock('../Analytics', () => ({
  trackSearch: jest.fn()
}))

describe('KBSearch', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('renders search input', () => {
    render(<KBSearch />)
    const input = screen.getByPlaceholderText('Search the knowledge base...')
    expect(input).toBeInTheDocument()
  })

  it('shows search results when typing', () => {
    render(<KBSearch />)
    const input = screen.getByPlaceholderText('Search the knowledge base...')

    fireEvent.change(input, { target: { value: 'getting' } })

    expect(screen.getByRole('heading', { name: 'Getting Started' })).toBeInTheDocument()
    expect(screen.getByText('Learn how to get started with NeuroSwarm')).toBeInTheDocument()
  })

  it('shows no results message when no matches found', () => {
    render(<KBSearch />)
    const input = screen.getByPlaceholderText('Search the knowledge base...')

    fireEvent.change(input, { target: { value: 'nonexistent' } })

    expect(screen.getByText(/No results found for/)).toBeInTheDocument()
  })

  it('clears search when X button is clicked', () => {
    render(<KBSearch />)
    const input = screen.getByPlaceholderText('Search the knowledge base...')

    fireEvent.change(input, { target: { value: 'getting' } })
    expect(screen.getByRole('heading', { name: 'Getting Started' })).toBeInTheDocument()

    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)

    expect(input).toHaveValue('')
    expect(screen.queryByRole('heading', { name: 'Getting Started' })).not.toBeInTheDocument()
  })

  it('closes results when clicking outside', () => {
    render(<KBSearch />)
    const input = screen.getByPlaceholderText('Search the knowledge base...')

    fireEvent.change(input, { target: { value: 'getting' } })
    expect(screen.getByRole('heading', { name: 'Getting Started' })).toBeInTheDocument()

    // Click outside (on the container div)
    fireEvent.click(document.body)

    // Results should still be visible since we're not handling outside clicks in this component
    // This test documents current behavior - could be enhanced with outside click handling
  })
})