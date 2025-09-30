import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

// Task and Board types
export interface Task {
  id: string
  title: string
  description?: string
  listId: string
  completed: boolean
  createdAt: string
  updatedAt: string
  userId: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  tags?: string[]
}

export interface BoardList {
  id: string
  title: string
  tasks: Task[]
  color?: string
  order: number
  boardId: string
}

export interface Board {
  id: string
  title: string
  lists: BoardList[]
  userId: string
  createdAt: string
  updatedAt: string
}

// Context types
interface TaskContextValue {
  // State
  boards: Board[]
  currentBoard: Board | null
  tasks: Task[]
  lists: BoardList[]
  loading: boolean
  error: string | null
  
  // Task operations
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  moveTask: (taskId: string, fromListId: string, toListId: string) => Promise<void>
  toggleTaskCompletion: (taskId: string) => Promise<void>
  
  // List operations
  createList: (list: Omit<BoardList, 'id' | 'tasks'>) => Promise<void>
  updateList: (listId: string, updates: Partial<BoardList>) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  
  // Board operations
  createBoard: (board: Omit<Board, 'id' | 'createdAt' | 'updatedAt' | 'lists'>) => Promise<void>
  updateBoard: (boardId: string, updates: Partial<Board>) => Promise<void>
  deleteBoard: (boardId: string) => Promise<void>
  setCurrentBoard: (boardId: string) => void
  
  // Utility functions
  getTasksByList: (listId: string) => Task[]
  getTasksByBoard: (boardId: string) => Task[]
  searchTasks: (query: string) => Task[]
  getTasksByTag: (tag: string) => Task[]
  getTasksByPriority: (priority: 'low' | 'medium' | 'high') => Task[]
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [boards, setBoards] = useState<Board[]>([])
  const [currentBoard, setCurrentBoardState] = useState<Board | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allLists, setAllLists] = useState<BoardList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to sort tasks by creation date (newest first)
  const sortTasksByDate = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Helper function to update lists with sorted tasks
  const updateListsWithSortedTasks = (lists: BoardList[]): BoardList[] => {
    return lists.map(list => ({
      ...list,
      tasks: sortTasksByDate(list.tasks)
    }))
  }

  // Get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('token')
    }
    return null
  }

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = getAuthToken()
    if (!token) throw new Error('No authentication token')

    console.log('=== API CALL DEBUG ===')
    console.log('Endpoint:', endpoint)
    console.log('Options:', options)
    console.log('Token exists:', !!token)
    console.log('Current user:', user?.id)
    console.log('========================')

    const response = await fetch(`http://localhost:4000/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('API Error:', errorData)
      throw new Error(errorData.error || 'API request failed')
    }

    const result = await response.json()
    console.log('API Response:', result)
    return result
  }

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      loadBoards()
    } else {
      // Clear data when user logs out
      setBoards([])
      setAllTasks([])
      setAllLists([])
      setCurrentBoardState(null)
      setLoading(false)
    }
  }, [user?.id])

  const loadBoards = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        console.log('No user ID found, skipping board load')
        setLoading(false)
        return
      }

      console.log('Loading boards for user:', user.id)

      // Load boards with their lists and tasks
      const data = await apiCall(`/boards`)
      console.log('API Response:', data)
      const boards = data.boards || []
      console.log('Boards loaded:', boards)
      
      // Validate that all boards belong to the current user
      const userBoards = boards.filter((board: Board) => board.userId === user.id)
      console.log('User boards after filtering:', userBoards.length)
      
      // Extract all lists and tasks from boards
      const allLists: BoardList[] = []
      const allTasks: Task[] = []
      
      userBoards.forEach((board: Board) => {
        console.log('Processing board:', board.title, 'Lists:', board.lists?.length || 0)
        if (board.lists) {
          board.lists.forEach((list: BoardList) => {
            // Filter tasks to ensure they belong to the current user
            const userTasks = list.tasks.filter((task: Task) => task.userId === user.id)
            const sortedTasks = sortTasksByDate(userTasks)
            allLists.push({ ...list, tasks: sortedTasks })
            allTasks.push(...sortedTasks)
          })
        }
      })
      
      console.log('All lists extracted:', allLists.length)
      console.log('All tasks extracted:', allTasks.length)
      
      setBoards(userBoards)
      setAllLists(allLists)
      setAllTasks(allTasks)
      
      // Set first board as current if none selected
      if (userBoards.length > 0 && !currentBoard) {
        setCurrentBoardState(userBoards[0])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load boards')
      console.error('Error loading boards:', err)
    } finally {
      setLoading(false)
    }
  }

  // Task operations
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('=== CREATE TASK DEBUG ===')
      console.log('Task data received:', taskData)
      console.log('Current user:', user?.id)
      console.log('Task userId:', taskData.userId)
      console.log('========================')
      
      // Validate that the task is being created for the current user
      if (taskData.userId !== user?.id) {
        throw new Error('Cannot create task for different user')
      }
      
      // Validate required fields
      if (!taskData.title || !taskData.title.trim()) {
        throw new Error('Task title is required')
      }
      if (!taskData.listId || !taskData.listId.trim()) {
        throw new Error('Task listId is required')
      }
      if (!taskData.userId || !taskData.userId.trim()) {
        throw new Error('Task userId is required')
      }

      // Prepare the request body
      const requestBody = {
        title: taskData.title.trim(),
        description: taskData.description || '',
        listId: taskData.listId.trim(),
        userId: taskData.userId.trim(),
        priority: taskData.priority || 'medium',
        completed: taskData.completed || false,
        dueDate: taskData.dueDate || null,
        tags: taskData.tags || []
      }

      console.log('Request body prepared:', requestBody)

      const newTask = await apiCall('/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      console.log('Task created successfully:', newTask)

      // Validate that the created task belongs to the current user
      if (newTask.task.userId !== user?.id) {
        throw new Error('Created task does not belong to current user')
      }

      // Update local state - find the board that contains the list
      setBoards(prev => prev.map(board => {
        const listExists = board.lists.some(list => list.id === taskData.listId)
        if (listExists) {
          return {
            ...board,
            lists: board.lists.map(list =>
              list.id === taskData.listId
                ? { ...list, tasks: sortTasksByDate([...list.tasks, newTask.task]) }
                : list
            )
          }
        }
        return board
      }))

      if (currentBoard) {
        const listExists = currentBoard.lists.some(list => list.id === taskData.listId)
        if (listExists) {
          setCurrentBoardState(prev => prev ? {
            ...prev,
            lists: prev.lists.map(list =>
              list.id === taskData.listId
                ? { ...list, tasks: sortTasksByDate([...list.tasks, newTask.task]) }
                : list
            )
          } : null)
        }
      }

      // Update all tasks and lists
      setAllTasks(prev => [...prev, newTask.task])
      setAllLists(prev => prev.map(list => 
        list.id === taskData.listId 
          ? { ...list, tasks: sortTasksByDate([...list.tasks, newTask.task]) }
          : list
      ))
    } catch (err: any) {
      console.error('Failed to create task:', err)
      setError(err.message || 'Failed to create task')
      throw err
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      // Validate that the task belongs to the current user before updating
      const existingTask = allTasks.find(task => task.id === taskId)
      if (existingTask && existingTask.userId !== user?.id) {
        throw new Error('Cannot update task that does not belong to current user')
      }

      const updatedTask = await apiCall(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      console.log('Task updated:', updatedTask)

      // Validate that the updated task still belongs to the current user
      if (updatedTask.task.userId !== user?.id) {
        throw new Error('Updated task does not belong to current user')
      }

      // Update local state
      setBoards(prev => prev.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          tasks: sortTasksByDate(list.tasks.map(task =>
            task.id === taskId ? { ...task, ...updatedTask.task } : task
          ))
        }))
      })))

      if (currentBoard) {
        setCurrentBoardState(prev => prev ? {
          ...prev,
          lists: prev.lists.map(list => ({
            ...list,
            tasks: sortTasksByDate(list.tasks.map(task =>
              task.id === taskId ? { ...task, ...updatedTask.task } : task
            ))
          }))
        } : null)
      }

      // Update all tasks and lists
      setAllTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updatedTask.task } : task
      ))
      setAllLists(prev => prev.map(list => ({
        ...list,
        tasks: sortTasksByDate(list.tasks.map(task =>
          task.id === taskId ? { ...task, ...updatedTask.task } : task
        ))
      })))
    } catch (err: any) {
      setError(err.message || 'Failed to update task')
      throw err
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      // Validate that the task belongs to the current user before deleting
      const existingTask = allTasks.find(task => task.id === taskId)
      if (existingTask && existingTask.userId !== user?.id) {
        throw new Error('Cannot delete task that does not belong to current user')
      }

      await apiCall(`/tasks/${taskId}`, {
        method: 'DELETE',
      })

      console.log('Task deleted:', taskId)

      // Update local state
      setBoards(prev => prev.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          tasks: list.tasks.filter(task => task.id !== taskId)
        }))
      })))

      if (currentBoard) {
        setCurrentBoardState(prev => prev ? {
          ...prev,
          lists: prev.lists.map(list => ({
            ...list,
            tasks: list.tasks.filter(task => task.id !== taskId)
          }))
        } : null)
      }

      // Update all tasks and lists
      setAllTasks(prev => prev.filter(task => task.id !== taskId))
      setAllLists(prev => prev.map(list => ({
        ...list,
        tasks: list.tasks.filter(task => task.id !== taskId)
      })))
    } catch (err: any) {
      setError(err.message || 'Failed to delete task')
      throw err
    }
  }

  const moveTask = async (taskId: string, fromListId: string, toListId: string) => {
    try {
      console.log('Moving task:', taskId, 'from', fromListId, 'to', toListId)
      
      // Validate that the task belongs to the current user before moving
      const existingTask = allTasks.find(task => task.id === taskId)
      if (existingTask && existingTask.userId !== user?.id) {
        throw new Error('Cannot move task that does not belong to current user')
      }
      
      await apiCall(`/tasks/${taskId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ listId: toListId }),
      })

      console.log('Task moved successfully on backend')

      // Find the task to move
      const taskToMove = allTasks.find(task => task.id === taskId)
      if (!taskToMove) {
        console.error('Task not found for moving:', taskId)
        return
      }

      const updatedTask = { ...taskToMove, listId: toListId }
      console.log('Updated task:', updatedTask)

      // Update boards state
      setBoards(prev => prev.map(board => ({
        ...board,
        lists: board.lists.map(list => {
          if (list.id === fromListId) {
            return { ...list, tasks: list.tasks.filter(t => t.id !== taskId) }
          }
          if (list.id === toListId) {
            return { ...list, tasks: sortTasksByDate([...list.tasks, updatedTask]) }
          }
          return list
        })
      })))

      // Update current board state
      if (currentBoard) {
        setCurrentBoardState(prev => {
          if (!prev) return null
          
          return {
            ...prev,
            lists: prev.lists.map(list => {
              if (list.id === fromListId) {
                return { ...list, tasks: list.tasks.filter(t => t.id !== taskId) }
              }
              if (list.id === toListId) {
                return { ...list, tasks: sortTasksByDate([...list.tasks, updatedTask]) }
              }
              return list
            })
          }
        })
      }

      // Update all tasks and lists
      setAllTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ))
      setAllLists(prev => prev.map(list => {
        if (list.id === fromListId) {
          return { ...list, tasks: list.tasks.filter(t => t.id !== taskId) }
        }
        if (list.id === toListId) {
          return { ...list, tasks: sortTasksByDate([...list.tasks, updatedTask]) }
        }
        return list
      }))

      console.log('Task moved successfully in state')
    } catch (err: any) {
      console.error('Failed to move task:', err)
      setError(err.message || 'Failed to move task')
      throw err
    }
  }

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = allTasks.find(task => task.id === taskId)
      if (!task) throw new Error('Task not found')
      
      // Validate that the task belongs to the current user
      if (task.userId !== user?.id) {
        throw new Error('Cannot toggle completion for task that does not belong to current user')
      }

      await updateTask(taskId, { completed: !task.completed })
    } catch (err: any) {
      setError(err.message || 'Failed to toggle task completion')
      throw err
    }
  }

  // List operations
  const createList = async (listData: Omit<BoardList, 'id' | 'tasks'>) => {
    try {
      const newList = await apiCall('/lists', {
        method: 'POST',
        body: JSON.stringify(listData),
      })

      // Update local state
      setBoards(prev => prev.map(board => 
        board.id === listData.boardId ? {
          ...board,
          lists: [...board.lists, { ...newList.list, tasks: [] }]
        } : board
      ))

      if (currentBoard && currentBoard.id === listData.boardId) {
        setCurrentBoardState(prev => prev ? {
          ...prev,
          lists: [...prev.lists, { ...newList.list, tasks: [] }]
        } : null)
      }

      // Update all lists
      setAllLists(prev => [...prev, { ...newList.list, tasks: [] }])
    } catch (err: any) {
      setError(err.message || 'Failed to create list')
      throw err
    }
  }

  const updateList = async (listId: string, updates: Partial<BoardList>) => {
    try {
      const updatedList = await apiCall(`/lists/${listId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      // Update local state
      setBoards(prev => prev.map(board => ({
        ...board,
        lists: board.lists.map(list =>
          list.id === listId ? { ...list, ...updatedList.list } : list
        )
      })))

      if (currentBoard) {
        setCurrentBoardState(prev => prev ? {
          ...prev,
          lists: prev.lists.map(list =>
            list.id === listId ? { ...list, ...updatedList.list } : list
          )
        } : null)
      }

      // Update all lists
      setAllLists(prev => prev.map(list => 
        list.id === listId ? { ...list, ...updatedList.list } : list
      ))
    } catch (err: any) {
      setError(err.message || 'Failed to update list')
      throw err
    }
  }

  const deleteList = async (listId: string) => {
    try {
      await apiCall(`/lists/${listId}`, {
        method: 'DELETE',
      })

      // Update local state
      setBoards(prev => prev.map(board => ({
        ...board,
        lists: board.lists.filter(list => list.id !== listId)
      })))

      if (currentBoard) {
        setCurrentBoardState(prev => prev ? {
          ...prev,
          lists: prev.lists.filter(list => list.id !== listId)
        } : null)
      }

      // Update all lists
      setAllLists(prev => prev.filter(list => list.id !== listId))
    } catch (err: any) {
      setError(err.message || 'Failed to delete list')
      throw err
    }
  }

  // Board operations
  const createBoard = async (boardData: Omit<Board, 'id' | 'createdAt' | 'updatedAt' | 'lists'>) => {
    try {
      console.log('Creating board with data:', boardData)
      
      // Validate that the board is being created for the current user
      if (boardData.userId !== user?.id) {
        throw new Error('Cannot create board for different user')
      }
      
      const newBoard = await apiCall('/boards', {
        method: 'POST',
        body: JSON.stringify(boardData),
      })

      console.log('Board created:', newBoard)

      // Reload boards to get the new board with its default lists
      await loadBoards()
    } catch (err: any) {
      console.error('Failed to create board:', err)
      setError(err.message || 'Failed to create board')
      throw err
    }
  }

  const updateBoard = async (boardId: string, updates: Partial<Board>) => {
    try {
      const updatedBoard = await apiCall(`/boards/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      setBoards(prev => prev.map(board =>
        board.id === boardId ? { ...board, ...updatedBoard.board } : board
      ))

      if (currentBoard && currentBoard.id === boardId) {
        setCurrentBoardState(prev => prev ? { ...prev, ...updatedBoard.board } : null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update board')
      throw err
    }
  }

  const deleteBoard = async (boardId: string) => {
    try {
      await apiCall(`/boards/${boardId}`, {
        method: 'DELETE',
      })

      setBoards(prev => prev.filter(board => board.id !== boardId))

      if (currentBoard && currentBoard.id === boardId) {
        setCurrentBoardState(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete board')
      throw err
    }
  }

  const setCurrentBoard = (boardId: string) => {
    const board = boards.find(b => b.id === boardId)
    if (board) {
      setCurrentBoardState(board)
    }
  }

  // Utility functions
  const getTasksByList = (listId: string): Task[] => {
    return allLists
      .find(list => list.id === listId)
      ?.tasks.filter(task => task.userId === user?.id) || []
  }

  const getTasksByBoard = (boardId: string): Task[] => {
    return boards
      .find(board => board.id === boardId)
      ?.lists.flatMap(list => list.tasks.filter(task => task.userId === user?.id)) || []
  }

  const searchTasks = (query: string): Task[] => {
    return allTasks.filter(task => 
      task.userId === user?.id && (
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description?.toLowerCase().includes(query.toLowerCase())
      )
    )
  }

  const getTasksByTag = (tag: string): Task[] => {
    return allTasks.filter(task => task.userId === user?.id && task.tags?.includes(tag))
  }

  const getTasksByPriority = (priority: 'low' | 'medium' | 'high'): Task[] => {
    return allTasks.filter(task => task.userId === user?.id && task.priority === priority)
  }

  // Computed values
  const tasks = useMemo(() => {
    return sortTasksByDate(allTasks.filter(task => task.userId === user?.id))
  }, [allTasks, user?.id])

  const lists = useMemo(() => {
    return updateListsWithSortedTasks(allLists)
  }, [allLists])

  const value = useMemo(() => ({
    // State
    boards,
    currentBoard,
    tasks,
    lists,
    loading,
    error,
    
    // Task operations
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    toggleTaskCompletion,
    
    // List operations
    createList,
    updateList,
    deleteList,
    
    // Board operations
    createBoard,
    updateBoard,
    deleteBoard,
    setCurrentBoard,
    
    // Utility functions
    getTasksByList,
    getTasksByBoard,
    searchTasks,
    getTasksByTag,
    getTasksByPriority,
  }), [
    boards,
    currentBoard,
    tasks,
    lists,
    loading,
    error,
    user?.id,
  ])

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export function useTasks() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider')
  }
  return context
}