const Bull = require('bull');
const nodemailer = require('nodemailer');
const { User } = require('../models');

// Create email queue
const emailQueue = new Bull('email queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});


emailQueue.process('send-email', async (job) => {
  try {
    const { userId, taskId, taskTitle, type } = job.data;

    console.log(`Processing email job for user ${userId}`);
    console.log(`Sending email to: ${job.data.email}`);

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let subject, htmlContent;

    if (type === 'task_completion') {
      subject = `Task Completed: ${taskTitle}`;
      htmlContent = `
        <h2>Task Completed!</h2>
        <p>Hi ${user.username},</p>
        <p>Your task "<strong>${taskTitle}</strong>" has been marked as completed.</p>
        <p>Task ID: ${taskId}</p>
        <p>Completed at: ${new Date().toLocaleString()}</p>
        <br>
        <p>Best regards,<br>Task Management System</p>
      `;
    } else {
      subject = 'Task Notification';
      htmlContent = `<p>Hi ${user.username}, you have a task notification.</p>`;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: job.data.email,
      subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${job.data.email}:`, result.messageId);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email job failed:', error);
    throw error; // This will cause the job to fail and retry
  }
});

// Add email job to queue
const addEmailJob = async (jobData) => {
  try {
    const job = await emailQueue.add('send-email', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: 10,
      removeOnFail: 5
    });

    console.log(`Email job added to queue: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Failed to add email job:', error);
    throw error;
  }
};

// Queue event handlers
emailQueue.on('completed', (job, result) => {
  console.log(`Email job ${job.id} completed:`, result);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err.message);
});

emailQueue.on('stalled', (job) => {
  console.warn(`Email job ${job.id} stalled`);
});

// Initialize job queue
const initJobQueue = async () => {
  console.log('Email job queue initialized');

  // Clean up old jobs on startup
  await emailQueue.clean(5 * 60 * 1000, 'completed');
  await emailQueue.clean(5 * 60 * 1000, 'failed');

  return emailQueue;
};

// Graceful shutdown
const closeJobQueue = async () => {
  await emailQueue.close();
  console.log('Email job queue closed');
};

module.exports = {
  emailQueue,
  addEmailJob,
  initJobQueue,
  closeJobQueue
}; 