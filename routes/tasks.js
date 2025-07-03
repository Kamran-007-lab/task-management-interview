const express = require('express');
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask
} = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Task CRUD operations
router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Task completion endpoint
router.post('/:id/complete', completeTask);

module.exports = router; 