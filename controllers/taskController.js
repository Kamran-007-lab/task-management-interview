const { Task, User } = require('../models');
const { getRedisClient } = require('../config/redis');
const { addEmailJob } = require('../jobs/emailJob');

const CACHE_KEY = 'incomplete_tasks';
const CACHE_EXPIRY = 300; // 5 minutes

// Create new task
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      userId
    });

    // Invalidate cache when creating a new task
    const redisClient = getRedisClient();
    await redisClient.del(CACHE_KEY);

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all tasks for user
const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, page = 1, limit = 10 } = req.query;

    // Build where clause
    const whereClause = { userId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    // Check cache for incomplete tasks only
    const redisClient = getRedisClient();
    if (status !== 'completed' && !priority) {
      const cachedTasks = await redisClient.get(CACHE_KEY);
      if (cachedTasks) {
        console.log('Returning cached tasks');
        return res.json(JSON.parse(cachedTasks));
      }
    }

    const offset = (page - 1) * limit;
    const tasks = await Task.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }]
    });

    const result = {
      tasks: tasks.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tasks.count,
        totalPages: Math.ceil(tasks.count / limit)
      }
    };

    // Cache incomplete tasks
    if (status !== 'completed' && !priority) {
      await redisClient.setEx(CACHE_KEY, CACHE_EXPIRY, JSON.stringify(result));
    }

    res.json(result);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single task
const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({
      where: { id, userId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email']
      }]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate } = req.body;
    const userId = req.user.id;

    const task = await Task.findOne({ where: { id, userId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    await task.update(updateData);

    // Invalidate cache
    const redisClient = getRedisClient();
    await redisClient.del(CACHE_KEY);

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Complete task
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ where: { id, userId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    task.status = 'completed';
    await task.save();

    setTimeout(async () => {
      task.completedAt = new Date();
      await task.save();
    }, 10);

    // Add email job to queue
    await addEmailJob({
      userId,
      taskId: id,
      taskTitle: task.title,
      type: 'task_completion'
    });

    res.json({
      message: 'Task completed successfully',
      task
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ where: { id, userId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();

    // Invalidate cache
    const redisClient = getRedisClient();
    await redisClient.del(CACHE_KEY);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  completeTask,
  deleteTask
}; 