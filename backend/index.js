// MongoDB-integrated Express backend with JWT auth and Google OAuth
// Run: NODE_ENV=development node backend/index.js
// Make sure to install: npm install mongoose dotenv

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const helmet = require('helmet')

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sbinwasii_db_user:tMv7nPGILKN5YVOR@cluster0.1idyc8u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

// Google OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000/'

// MongoDB Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: false }, // Made optional for OAuth users
  googleId: { type: String, sparse: true, unique: true }, // For Google OAuth
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const listSchema = new mongoose.Schema({
  title: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  color: { type: String, default: '#3b82f6' },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  listId: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: Date },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)
const Board = mongoose.model('Board', boardSchema)
const List = mongoose.model('List', listSchema)
const Task = mongoose.model('Task', taskSchema)

// Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}))
app.use(express.json())
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))
app.use(passport.initialize())
app.use(passport.session())

// Passport serialize/deserialize
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

// Google OAuth Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id })
      
      if (user) {
        return done(null, user)
      }
      
      // Check if user with same email exists
      user = await User.findOne({ email: profile.emails[0].value })
      
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id
        user.authProvider = 'google'
        await user.save()
        return done(null, user)
      }
      
      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        authProvider: 'google',
        role: 'user'
      })
      
      return done(null, user)
    } catch (error) {
      return done(error, null)
    }
  }))
} else {
  console.warn('Google OAuth credentials not provided. Google sign-in will not work.')
}

// JWT Authentication Middleware
const authRequired = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Admin Middleware
const adminRequired = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// User Ownership Validation Middleware
const validateUserOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params
      let resource

      switch (resourceType) {
        case 'board':
          resource = await Board.findById(id)
          break
        case 'list':
          resource = await List.findById(id).populate('boardId')
          if (resource && resource.boardId) {
            resource = resource.boardId
          }
          break
        case 'task':
          resource = await Task.findById(id)
          break
        default:
          return res.status(400).json({ error: 'Invalid resource type' })
      }

      if (!resource) {
        return res.status(404).json({ error: `${resourceType} not found` })
      }

      // Check if the resource belongs to the current user
      const resourceUserId = resource.userId ? resource.userId.toString() : resource.userId
      if (resourceUserId !== req.user._id.toString()) {
        return res.status(403).json({ error: `Access denied: ${resourceType} does not belong to you` })
      }

      req.resource = resource
      next()
    } catch (error) {
      console.error(`Error validating ${resourceType} ownership:`, error)
      res.status(500).json({ error: 'Failed to validate ownership' })
    }
  }
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    seedDefaultData()
  })
  .catch(err => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

// Seed default admin user
async function seedDefaultData() {
  try {
    const adminExists = await User.findOne({ email: 'admin@mycollab.local' })
    if (!adminExists) {
      const passwordHash = bcrypt.hashSync('admin123', 10)
      await User.create({
        name: 'Admin',
        email: 'admin@mycollab.local',
        passwordHash,
        role: 'admin',
        authProvider: 'local'
      })
      console.log('Default admin user created: admin@mycollab.local / admin123')
    }
  } catch (error) {
    console.error('Error seeding default data:', error)
  }
}

// Helper function to create default lists for a board
async function createDefaultLists(boardId) {
  const defaultLists = [
    { title: 'Today', color: '#ef4444', order: 0 },
    { title: 'This Week', color: '#f59e0b', order: 1 },
    { title: 'Later', color: '#10b981', order: 2 },
    { title: 'Doing', color: '#3b82f6', order: 3 }
  ]

  const lists = await Promise.all(
    defaultLists.map(listData => 
      List.create({
        ...listData,
        boardId
      })
    )
  )

  return lists
}

// API Routes

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      authProvider: 'local'
    })

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if user signed up with Google
    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(401).json({ error: 'Please sign in with Google' })
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Google OAuth routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '7d' })
      
      // Redirect to frontend with token
      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }))}`)
    } catch (error) {
      console.error('OAuth callback error:', error)
      res.redirect(`${FRONTEND_URL}/login?error=auth_failed`)
    }
  }
)

// User Routes
app.get('/api/users', authRequired, adminRequired, async (req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 })
    const usersWithStringIds = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
    res.json({ users: usersWithStringIds })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.delete('/api/users/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { id } = req.params
    
    // Don't allow deleting the admin user
    const user = await User.findById(id)
    if (user && user.email === 'admin@mycollab.local') {
      return res.status(400).json({ error: 'Cannot delete admin user' })
    }

    await User.findByIdAndDelete(id)
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Board Routes
app.get('/api/boards', authRequired, async (req, res) => {
  try {
    // Get boards for the user
    const boards = await Board.find({ userId: req.user._id }).sort({ createdAt: -1 })
    
    // Get all lists for these boards
    const boardIds = boards.map(board => board._id)
    const lists = await List.find({ boardId: { $in: boardIds } }).sort({ order: 1 })
    
    // Get all tasks for these lists - ENHANCED USER VALIDATION
    const listIds = lists.map(list => list._id)
    const tasks = await Task.find({ 
      listId: { $in: listIds },
      userId: req.user._id  // Double-check user ownership
    }).sort({ createdAt: -1 })
    
    // Group lists by board
    const listsByBoard = {}
    lists.forEach(list => {
      if (!listsByBoard[list.boardId]) {
        listsByBoard[list.boardId] = []
      }
      listsByBoard[list.boardId].push(list)
    })
    
    // Group tasks by list
    const tasksByList = {}
    tasks.forEach(task => {
      if (!tasksByList[task.listId]) {
        tasksByList[task.listId] = []
      }
      tasksByList[task.listId].push(task)
    })
    
    // Combine everything
    const boardsWithLists = boards.map(board => ({
      id: board._id.toString(),
      title: board.title,
      userId: board.userId.toString(),
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      lists: (listsByBoard[board._id] || []).map(list => ({
        id: list._id.toString(),
        title: list.title,
        boardId: list.boardId.toString(),
        color: list.color,
        order: list.order,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        tasks: (tasksByList[list._id] || []).map(task => ({
          id: task._id.toString(),
          title: task.title,
          description: task.description,
          listId: task.listId.toString(),
          userId: task.userId.toString(),
          completed: task.completed,
          priority: task.priority,
          dueDate: task.dueDate,
          tags: task.tags,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }))
      }))
    }))

    res.json({ boards: boardsWithLists })
  } catch (error) {
    console.error('Get boards error:', error)
    res.status(500).json({ error: 'Failed to fetch boards' })
  }
})

app.post('/api/boards', authRequired, async (req, res) => {
  try {
    const { title } = req.body
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const board = await Board.create({
      title: title.trim(),
      userId: req.user._id
    })

    // Create default lists for the new board
    await createDefaultLists(board._id)

    // Return the board with its lists
    const lists = await List.find({ boardId: board._id }).sort({ order: 1 })
    const boardWithLists = {
      id: board._id.toString(),
      title: board.title,
      userId: board.userId.toString(),
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      lists: lists.map(list => ({
        id: list._id.toString(),
        title: list.title,
        boardId: list.boardId.toString(),
        color: list.color,
        order: list.order,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        tasks: []
      }))
    }

    res.json({ board: boardWithLists })
  } catch (error) {
    console.error('Create board error:', error)
    res.status(500).json({ error: 'Failed to create board' })
  }
})

app.put('/api/boards/:id', authRequired, validateUserOwnership('board'), async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const board = await Board.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { title: title.trim(), updatedAt: new Date() },
      { new: true }
    )

    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }

    res.json({ 
      board: {
        id: board._id.toString(),
        title: board.title,
        userId: board.userId.toString(),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      }
    })
  } catch (error) {
    console.error('Update board error:', error)
    res.status(500).json({ error: 'Failed to update board' })
  }
})

app.delete('/api/boards/:id', authRequired, validateUserOwnership('board'), async (req, res) => {
  try {
    const { id } = req.params

    // Delete all tasks in the board's lists
    const lists = await List.find({ boardId: id })
    const listIds = lists.map(list => list._id)
    await Task.deleteMany({ listId: { $in: listIds } })

    // Delete all lists in the board
    await List.deleteMany({ boardId: id })

    // Delete the board
    const board = await Board.findOneAndDelete({ _id: id, userId: req.user._id })

    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }

    res.json({ message: 'Board deleted successfully' })
  } catch (error) {
    console.error('Delete board error:', error)
    res.status(500).json({ error: 'Failed to delete board' })
  }
})

// List Routes
app.get('/api/lists', authRequired, async (req, res) => {
  try {
    // Get all boards for the user
    const boards = await Board.find({ userId: req.user._id })
    const boardIds = boards.map(board => board._id)
    
    // Get all lists for these boards
    const lists = await List.find({ boardId: { $in: boardIds } }).sort({ order: 1 })
    
    // Get all tasks for these lists - ENHANCED USER VALIDATION
    const listIds = lists.map(list => list._id)
    const tasks = await Task.find({ 
      listId: { $in: listIds },
      userId: req.user._id  // Double-check user ownership
    }).sort({ createdAt: -1 })
    
    // Group tasks by list
    const tasksByList = {}
    tasks.forEach(task => {
      if (!tasksByList[task.listId]) {
        tasksByList[task.listId] = []
      }
      tasksByList[task.listId].push(task)
    })
    
    // Combine lists with their tasks
    const listsWithTasks = lists.map(list => ({
      id: list._id.toString(),
      title: list.title,
      boardId: list.boardId.toString(),
      color: list.color,
      order: list.order,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      tasks: (tasksByList[list._id] || []).map(task => ({
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        listId: task.listId.toString(),
        userId: task.userId.toString(),
        completed: task.completed,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }))
    }))

    res.json({ lists: listsWithTasks })
  } catch (error) {
    console.error('Get lists error:', error)
    res.status(500).json({ error: 'Failed to fetch lists' })
  }
})

app.post('/api/lists', authRequired, async (req, res) => {
  try {
    const { title, boardId, color, order } = req.body

    if (!title || !title.trim() || !boardId) {
      return res.status(400).json({ error: 'Title and boardId are required' })
    }

    // Verify the board belongs to the user
    const board = await Board.findOne({ _id: boardId, userId: req.user._id })
    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }

    const list = await List.create({
      title: title.trim(),
      boardId,
      color: color || '#3b82f6',
      order: order || 0
    })

    res.json({ 
      list: {
        id: list._id.toString(),
        title: list.title,
        boardId: list.boardId.toString(),
        color: list.color,
        order: list.order,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      }
    })
  } catch (error) {
    console.error('Create list error:', error)
    res.status(500).json({ error: 'Failed to create list' })
  }
})

app.put('/api/lists/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const { title, color, order } = req.body

    // Verify the list belongs to the user through its board
    const list = await List.findById(id).populate('boardId')
    if (!list || !list.boardId || list.boardId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'List not found' })
    }

    const updatedList = await List.findByIdAndUpdate(
      id,
      {
        ...(title && { title: title.trim() }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
        updatedAt: new Date()
      },
      { new: true }
    )

    res.json({ 
      list: {
        id: updatedList._id.toString(),
        title: updatedList.title,
        boardId: updatedList.boardId.toString(),
        color: updatedList.color,
        order: updatedList.order,
        createdAt: updatedList.createdAt,
        updatedAt: updatedList.updatedAt
      }
    })
  } catch (error) {
    console.error('Update list error:', error)
    res.status(500).json({ error: 'Failed to update list' })
  }
})

app.delete('/api/lists/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params

    // Verify the list belongs to the user through its board
    const list = await List.findById(id).populate('boardId')
    if (!list || !list.boardId || list.boardId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'List not found' })
    }

    // Delete all tasks in the list
    await Task.deleteMany({ listId: id })

    // Delete the list
    await List.findByIdAndDelete(id)

    res.json({ message: 'List deleted successfully' })
  } catch (error) {
    console.error('Delete list error:', error)
    res.status(500).json({ error: 'Failed to delete list' })
  }
})

// Task Routes
app.get('/api/tasks', authRequired, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
      .populate('listId')
      .sort({ createdAt: -1 })

    const tasksWithStringIds = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      listId: task.listId._id.toString(),
      userId: task.userId.toString(),
      completed: task.completed,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }))

    res.json({ tasks: tasksWithStringIds })
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

app.post('/api/tasks', authRequired, async (req, res) => {
  try {
    const { title, description, listId, priority, dueDate, tags } = req.body

    if (!title || !title.trim() || !listId) {
      return res.status(400).json({ error: 'Title and listId are required' })
    }

    // Verify the list belongs to the user
    const list = await List.findById(listId).populate('boardId')
    if (!list || !list.boardId || list.boardId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'List not found' })
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      listId,
      userId: req.user._id,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || []
    })

    res.json({ 
      task: {
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        listId: task.listId.toString(),
        userId: task.userId.toString(),
        completed: task.completed,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

app.put('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, completed, priority, dueDate, tags } = req.body

    // Verify the task belongs to the user
    const task = await Task.findOne({ _id: id, userId: req.user._id })
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(completed !== undefined && { completed }),
        ...(priority && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(tags && { tags }),
        updatedAt: new Date()
      },
      { new: true }
    )

    res.json({ 
      task: {
        id: updatedTask._id.toString(),
        title: updatedTask.title,
        description: updatedTask.description,
        listId: updatedTask.listId.toString(),
        userId: updatedTask.userId.toString(),
        completed: updatedTask.completed,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        tags: updatedTask.tags,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt
      }
    })
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

app.put('/api/tasks/:id/move', authRequired, async (req, res) => {
  try {
    const { id } = req.params
    const { listId } = req.body

    if (!listId) {
      return res.status(400).json({ error: 'listId is required' })
    }

    // Verify the task belongs to the user
    const task = await Task.findOne({ _id: id, userId: req.user._id })
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Verify the target list belongs to the user
    const list = await List.findById(listId).populate('boardId')
    if (!list || !list.boardId || list.boardId.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Target list not found' })
    }

    // Update the task's list
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { listId, updatedAt: new Date() },
      { new: true }
    )

    res.json({ 
      task: {
        id: updatedTask._id.toString(),
        title: updatedTask.title,
        description: updatedTask.description,
        listId: updatedTask.listId.toString(),
        userId: updatedTask.userId.toString(),
        completed: updatedTask.completed,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        tags: updatedTask.tags,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt
      }
    })
  } catch (error) {
    console.error('Move task error:', error)
    res.status(500).json({ error: 'Failed to move task' })
  }
})

app.delete('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params

    const task = await Task.findOneAndDelete({ _id: id, userId: req.user._id })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// Admin Routes
app.get('/api/admin/stats', authRequired, adminRequired, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const adminUsers = await User.countDocuments({ role: 'admin' })
    const regularUsers = await User.countDocuments({ role: 'user' })
    const totalBoards = await Board.countDocuments()
    const totalTasks = await Task.countDocuments()

    // Get user growth data (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    res.json({
      totalUsers,
      adminUsers,
      regularUsers,
      totalBoards,
      totalTasks,
      userGrowth
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`MongoDB URI: ${MONGODB_URI}`)
  console.log(`Google OAuth configured: ${GOOGLE_CLIENT_ID ? 'Yes' : 'No'}`)
})