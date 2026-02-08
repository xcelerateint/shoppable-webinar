import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import { recordingProcessor } from './processors/recording.processor';
import { emailProcessor } from './processors/email.processor';
import { analyticsProcessor } from './processors/analytics.processor';

const prisma = new PrismaClient();
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues
const recordingQueue = new Queue('recording-processing', REDIS_URL);
const emailQueue = new Queue('email-notifications', REDIS_URL);
const analyticsQueue = new Queue('analytics-aggregation', REDIS_URL);

// Register processors
recordingQueue.process(async (job) => {
  return recordingProcessor(job.data, prisma);
});

emailQueue.process(async (job) => {
  return emailProcessor(job.data);
});

analyticsQueue.process(async (job) => {
  return analyticsProcessor(job.data, prisma);
});

// Event handlers
recordingQueue.on('completed', (job) => {
  console.log(`Recording job ${job.id} completed`);
});

recordingQueue.on('failed', (job, err) => {
  console.error(`Recording job ${job.id} failed:`, err);
});

emailQueue.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err);
});

analyticsQueue.on('completed', (job) => {
  console.log(`Analytics job ${job.id} completed`);
});

analyticsQueue.on('failed', (job, err) => {
  console.error(`Analytics job ${job.id} failed:`, err);
});

console.log('Worker started');
console.log('Listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await recordingQueue.close();
  await emailQueue.close();
  await analyticsQueue.close();
  await prisma.$disconnect();
  process.exit(0);
});
