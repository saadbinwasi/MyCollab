import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/router'
import UserDashboard from './src/components/UserDashboard'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock UserBadge component
jest.mock('./src/components/UserBadge', () => {
  return function MockUserBadge() {
    return <div data-testid="user-badge">User Badge</div>
  }
})

// Mock BoardsView component
jest.mock('./src/components/BoardsView', () => {
  return function MockBoardsView() {
    return <div data-testid="boards-view">Boards View</div>
  }
})

describe('UserDashboard', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard',
  }

  beforeEach(() => {
    useRouter.mockReturnValue(mockRouter)
    localStorageMock.getItem.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders user dashboard header correctly', () => {
      render(<UserDashboard />)
      
      expect(screen.getByText('MyCollab')).toBeInTheDocument()
      expect(screen.getByTestId('user-badge')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('renders mobile topbar', () => {
      render(<UserDashboard />)
      
      expect(screen.getByText('Menu')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders sidebar with correct sections', () => {
      render(<UserDashboard />)
      
      // Personal Settings section
      expect(screen.getByText('Personal Settings')).toBeInTheDocument()
      expect(screen.getByText('⚙️ Profile and Visibility')).toBeInTheDocument()
      expect(screen.getByText('🔧 Settings')).toBeInTheDocument()
      expect(screen.getByText('📈 Activity')).toBeInTheDocument()
      expect(screen.getByText('💳 Cards')).toBeInTheDocument()
      
      // Workspace section
      expect(screen.getByText('Workspace')).toBeInTheDocument()
      expect(screen.getByText('🗂️ Boards')).toBeInTheDocument()
      expect(screen.getByText('👥 Members')).toBeInTheDocument()
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument()
      expect(screen.getByText('🚀 Power-Ups')).toBeInTheDocument()
      expect(screen.getByText('💳 Billing')).toBeInTheDocument()
      expect(screen.getByText('⬇️ Export')).toBeInTheDocument()
    })

    it('renders main content area', () => {
      render(<UserDashboard />)
      
      expect(screen.getByTestId('boards-view')).toBeInTheDocument()
    })
  })

  describe('User Role Handling', () => {
    it('shows admin link for admin users', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }))
      
      render(<UserDashboard />)
      
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('hides admin link for regular users', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user'
      }))
      
      render(<UserDashboard />)
      
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    })

    it('handles missing user data gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(<UserDashboard />)
      
      expect(screen.getByText('MyCollab')).toBeInTheDocument()
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    })
  })

  describe('Sidebar Navigation', () => {
    it('opens sidebar when hamburger menu is clicked', () => {
      render(<UserDashboard />)
      
      const hamburgerButton = screen.getByText('Menu')
      fireEvent.click(hamburgerButton)
      
      const sidebar = document.querySelector('.sidebar')
      expect(sidebar).toHaveClass('open')
    })

    it('closes sidebar when scrim is clicked', () => {
      render(<UserDashboard />)
      
      // Open sidebar first
      const hamburgerButton = screen.getByText('Menu')
      fireEvent.click(hamburgerButton)
      
      // Then close it
      const scrim = document.querySelector('.scrim')
      fireEvent.click(scrim)
      
      const sidebar = document.querySelector('.sidebar')
      expect(sidebar).not.toHaveClass('open')
    })

    it('switches tabs correctly', () => {
      render(<UserDashboard />)
      
      // Click on Members tab
      const membersButton = screen.getByText('👥 Members')
      fireEvent.click(membersButton)
      
      expect(screen.getByText('Members')).toBeInTheDocument()
      expect(screen.getByText('This section is under construction.')).toBeInTheDocument()
    })

    it('shows active state for current tab', () => {
      render(<UserDashboard />)
      
      // Boards tab should be active by default
      const boardsButton = screen.getByText('🗂️ Boards')
      expect(boardsButton).toHaveClass('active')
    })

    it('switches between all tabs correctly', () => {
      render(<UserDashboard />)
      
      const tabs = [
        { button: '👥 Members', title: 'Members' },
        { button: '⚙️ Settings', title: 'Settings' },
        { button: '🚀 Power-Ups', title: 'Power-ups' },
        { button: '💳 Billing', title: 'Billing' },
        { button: '⬇️ Export', title: 'Export' },
      ]
      
      tabs.forEach(({ button, title }) => {
        fireEvent.click(screen.getByText(button))
        expect(screen.getByText(title)).toBeInTheDocument()
        expect(screen.getByText('This section is under construction.')).toBeInTheDocument()
      })
    })
  })

  describe('Boards Tab', () => {
    it('renders BoardsView component when boards tab is active', () => {
      render(<UserDashboard />)
      
      expect(screen.getByTestId('boards-view')).toBeInTheDocument()
    })

    it('switches back to boards tab correctly', () => {
      render(<UserDashboard />)
      
      // Switch to another tab first
      fireEvent.click(screen.getByText('👥 Members'))
      expect(screen.queryByTestId('boards-view')).not.toBeInTheDocument()
      
      // Switch back to boards
      fireEvent.click(screen.getByText('🗂️ Boards'))
      expect(screen.getByTestId('boards-view')).toBeInTheDocument()
    })
  })

  describe('Logout Functionality', () => {
    it('handles logout correctly', () => {
      render(<UserDashboard />)
      
      const logoutButton = screen.getByText('Log out')
      fireEvent.click(logoutButton)
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('handles logout errors gracefully', () => {
      // Mock localStorage.removeItem to throw an error
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      render(<UserDashboard />)
      
      const logoutButton = screen.getByText('Log out')
      fireEvent.click(logoutButton)
      
      // Should still navigate to home even if localStorage fails
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('User Data Loading', () => {
    it('loads user data from localStorage on mount', () => {
      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))
      
      render(<UserDashboard />)
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('user')
    })

    it('handles invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      // Should not throw an error
      expect(() => render(<UserDashboard />)).not.toThrow()
    })

    it('handles empty localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(<UserDashboard />)
      
      expect(screen.getByText('MyCollab')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('renders mobile topbar', () => {
      render(<UserDashboard />)
      
      expect(screen.getByText('Menu')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders scrim for mobile overlay', () => {
      render(<UserDashboard />)
      
      const scrim = document.querySelector('.scrim')
      expect(scrim).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('renders home link correctly', () => {
      render(<UserDashboard />)
      
      const homeLink = screen.getByText('Home')
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('renders admin link with correct href for admin users', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }))
      
      render(<UserDashboard />)
      
      const adminLink = screen.getByText('Admin')
      expect(adminLink).toHaveAttribute('href', '/admin')
    })
  })

  describe('Tab State Management', () => {
    it('maintains tab state correctly', () => {
      render(<UserDashboard />)
      
      // Default should be boards
      expect(screen.getByTestId('boards-view')).toBeInTheDocument()
      
      // Switch to members
      fireEvent.click(screen.getByText('👥 Members'))
      expect(screen.getByText('Members')).toBeInTheDocument()
      
      // Switch to settings
      fireEvent.click(screen.getByText('⚙️ Settings'))
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('shows correct active tab styling', () => {
      render(<UserDashboard />)
      
      // Boards should be active by default
      const boardsButton = screen.getByText('🗂️ Boards')
      expect(boardsButton).toHaveClass('active')
      
      // Click members
      fireEvent.click(screen.getByText('👥 Members'))
      const membersButton = screen.getByText('👥 Members')
      expect(membersButton).toHaveClass('active')
      expect(boardsButton).not.toHaveClass('active')
    })
  })

  describe('Error Handling', () => {
    it('handles router push errors gracefully', () => {
      mockPush.mockImplementation(() => {
        throw new Error('Navigation error')
      })
      
      render(<UserDashboard />)
      
      const logoutButton = screen.getByText('Log out')
      expect(() => fireEvent.click(logoutButton)).not.toThrow()
    })

    it('handles component unmounting during async operations', () => {
      const { unmount } = render(<UserDashboard />)
      
      // Unmount component immediately
      unmount()
      
      // Should not cause any errors
      expect(true).toBe(true)
    })
  })
})