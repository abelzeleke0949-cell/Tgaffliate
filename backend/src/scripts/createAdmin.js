import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'node:readline/promises';
import Admin from '../models/Admin.js';

dotenv.config();

const prompt = async (question, { hidden = false } = {}) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const name = process.env.ADMIN_NAME || (await prompt('Admin name: '));
  const email = (process.env.ADMIN_EMAIL || (await prompt('Admin email: '))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (await prompt('Admin password (min 8 chars): '));

  if (!name || !email || !password || password.length < 8) {
    console.error('❌ Name, email, and an 8+ character password are required.');
    process.exit(1);
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = password;
    existing.name = name;
    await existing.save();
    console.log(`✅ Updated existing admin: ${email}`);
  } else {
    await Admin.create({ name, email, password });
    console.log(`✅ Created admin: ${email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((error) => {
  console.error('❌ Error creating admin:', error);
  process.exit(1);
});
