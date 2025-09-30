import { useState, useEffect } from 'react'
import { useTasks } from '@/context/TaskContext'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Tag, Flag, Layout, AlertCircle } from 'lucide-react'

export default function BoardsView() {
  const { user } = useAuth()
  const {
    boards,
    lists,
    loading,
    error,
    createBoard,
    createTask,
    moveTask,
    toggleTaskCompletion,
    deleteTask,
  } = useTasks()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string>('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [boardTitle, setBoardTitle] = useState('')
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [dragOverListId, setDragOverListId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sort tasks by creation date (newest first)
  const sortedLists = lists.map(list => ({
    ...list,
    tasks: [...list.tasks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }))

  // Validate user authentication
  useEffect(() => {
    if (!user?.id) {
      console.warn('No user authenticated in BoardsView')
    }
  }, [user])

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Creating board with title:', boardTitle)
    
    // Validate user is logged in
    if (!user?.id) {
      alert('You must be logged in to create a board')
      return
    }

    if (!boardTitle.trim()) {
      alert('Board title is required')
      return
    }

    setIsSubmitting(true)
    try {
      await createBoard({
        title: boardTitle.trim(),
        userId: user.id, // Ensure we use the current user's ID
      })

      setBoardTitle('')
      setIsCreateBoardModalOpen(false)
      console.log('Board created successfully')
    } catch (error) {
      console.error('Failed to create board:', error)
      alert('Failed to create board. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenCreateBoardModal = () => {
    console.log('Opening create board modal')
    setIsCreateBoardModalOpen(true)
  }

  // Add a proper modal close handler
  const handleCloseModal = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskPriority('medium')
    setSelectedListId('')
    setIsModalOpen(false)
  }

  const handleAddTask = (listId: string) => {
    // Validate user is logged in
    if (!user?.id) {
      alert('You must be logged in to create a task')
      return
    }

    console.log('Adding task to list:', listId)
    console.log('Available lists:', lists.map(l => ({ id: l.id, title: l.title })))
    setSelectedListId(listId)
    setIsModalOpen(true)
  }

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate user is logged in
    if (!user?.id) {
      alert('You must be logged in to create a task')
      return
    }
    
    // Validate required fields
    if (!taskTitle.trim()) {
      alert('Task title is required')
      return
    }

    if (!selectedListId || !selectedListId.trim()) {
      alert('No list selected. Please try again.')
      return
    }

    console.log('Submitting task with data:', {
      title: taskTitle,
      description: taskDescription,
      listId: selectedListId,
      userId: user.id, // Ensure we use the current user's ID
      priority: taskPriority,
    })

    setIsSubmitting(true)
    try {
      await createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        listId: selectedListId,
        completed: false,
        userId: user.id, // Ensure we use the current user's ID
        priority: taskPriority,
      })

      // Reset form and close modal
      handleCloseModal()
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    // Validate user is logged in
    if (!user?.id) {
      e.preventDefault()
      return
    }

    setDraggedTask(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault()
    setDragOverListId(listId)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverListId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault()
    
    // Validate user is logged in
    if (!user?.id) {
      return
    }

    if (!draggedTask) return

    const sourceList = lists.find(list => 
      list.tasks.some(task => task.id === draggedTask)
    )
    
    if (sourceList && sourceList.id !== targetListId) {
      try {
        await moveTask(draggedTask, sourceList.id, targetListId)
      } catch (error) {
        console.error('Failed to move task:', error)
        alert('Failed to move task. Please try again.')
      }
    }

    handleDragEnd()
  }

  const handleTaskCompletion = async (taskId: string) => {
    // Validate user is logged in
    if (!user?.id) {
      alert('You must be logged in to update tasks')
      return
    }

    try {
      await toggleTaskCompletion(taskId)
    } catch (error) {
      console.error('Failed to toggle task completion:', error)
      alert('Failed to update task. Please try again.')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // Validate user is logged in
    if (!user?.id) {
      alert('You must be logged in to delete tasks')
      return
    }

    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task. Please try again.')
    }
  }

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading boards...</div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  // Show authentication error
  if (!user?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-500 mb-6">You must be logged in to view your boards and tasks.</p>
          </div>
        </div>
      </div>
    )
  }

  console.log('BoardsView render - boards:', boards.length, 'lists:', lists.length, 'modal open:', isCreateBoardModalOpen)
  console.log('Lists data:', lists.map(l => ({ id: l.id, title: l.title, boardId: l.boardId })))

  return (
    <>
      {/* Show create board button when no boards exist */}
      {boards.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <Layout className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No boards found</h3>
              <p className="text-gray-500 mb-6">Create your first board to start organizing your tasks!</p>
            </div>
            
            <Button 
              onClick={handleOpenCreateBoardModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create Your First Board'}
            </Button>
            
            {/* Debug: Show modal state */}
            <div className="mt-4 text-sm text-gray-500">
              Modal state: {isCreateBoardModalOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
      ) : sortedLists.length === 0 ? (
        /* Show create board button when boards exist but no lists */
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <Layout className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No task lists found</h3>
              <p className="text-gray-500 mb-6">Your boards don't have any task lists yet. Create a new board with default lists!</p>
            </div>
            
            <Button 
              onClick={handleOpenCreateBoardModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Create New Board'}
            </Button>
            
            {/* Debug: Show modal state */}
            <div className="mt-4 text-sm text-gray-500">
              Modal state: {isCreateBoardModalOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
      ) : (
        /* Show boards when they exist */
      <div className="board-surface">
          {/* Header with Create Board button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Boards</h2>
            <Button 
              onClick={handleOpenCreateBoardModal}
              variant="outline"
              className="flex items-center gap-2 text-black"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </Button>
          </div>

        <div className="board-scroller">
            {sortedLists.map((list) => (
            <div 
              key={list.id} 
                className={`board-list ${list.id}-theme`}
              onDragOver={(e) => handleDragOver(e, list.id)}
              onDrop={(e) => handleDrop(e, list.id)}
            >
                <div className="board-list-title">
                  {list.title}
                  <span className="text-sm opacity-70">({list.tasks.length})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {list.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="board-card"
                  draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="card-content">
                        <div className="completion-circle" onClick={() => handleTaskCompletion(task.id)}>
                          {task.completed && <span className="checkmark">✓</span>}
                        </div>
                        <div className={`card-title ${task.completed ? 'completed-text' : ''}`}>
                          {task.title}
                        </div>
                      </div>
                      
                      {task.description && (
                        <div className="text-sm text-gray-600 mt-2">
                          {task.description}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          {task.priority && (
                            <Badge className={getPriorityColor(task.priority)}>
                              <Flag className="w-3 h-3 mr-1" />
                              {task.priority}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <Badge variant="outline">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  className="board-add"
                  onClick={() => handleAddTask(list.id)}
                  disabled={!user?.id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add a card
                </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Board Modal - MOVED OUTSIDE ALL CONDITIONAL RENDERS */}
      {isCreateBoardModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setIsCreateBoardModalOpen(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 100000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a'
              }}>Create New Board</h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
                onClick={() => setIsCreateBoardModalOpen(false)}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateBoard} style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0f172a',
                  marginBottom: '8px'
                }}>Board Title</label>
                <input
                className='text-black'  
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="Enter board title..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                padding: '16px 0 0 0',
                borderTop: '1px solid #e5e7eb',
                marginTop: '16px'
              }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateBoardModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  className='text-black' 
                  type="submit"
                  disabled={isSubmitting || !boardTitle.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Board'}
                </Button>
              </div>
            </form>
            </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Task</h3>
              <button
                className="modal-close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitTask} className="modal-body">
              {/* Debug info - remove in production */}
              <div className="field">
                <small className="text-gray-500">
                  Selected List ID: {selectedListId || 'None'}
                </small>
              </div>
              
              <div className="field">
                <label className="modal-label">Task Title</label>
                <input
                  type="text"
                  className="modal-input text-black"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="field">
                <label className="modal-label">Description</label>
                <textarea
                  className="modal-input text-black"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description..."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="field">
                <label className="modal-label">Priority</label>
                <select
                  className="modal-input text-black"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="modal-footer">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  className='text-blue-500' 
                  type="submit"
                  disabled={!selectedListId || !taskTitle.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}