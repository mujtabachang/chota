import { readFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const choice = readFileSync('choice.txt', 'utf-8').trim();
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = choice === 'Gemini' ? genAI.getGenerativeModel({ model: 'gemini-pro' }) : null;

export default model;