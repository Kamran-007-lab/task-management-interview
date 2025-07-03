const { sequelize } = require('../config/database');
const User = require('./User');
const Task = require('./Task');

// Define associations
User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Task
}; 