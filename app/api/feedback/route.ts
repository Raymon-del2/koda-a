import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  timestamp: string;
  userAgent: string;
  url: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  submittedAt: string;
}

// Store feedback in a JSON file
const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read existing feedback
function getFeedback(): FeedbackItem[] {
  try {
    ensureDataDir();
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading feedback file:', error);
  }
  return [];
}

// Save feedback to file
function saveFeedback(feedback: FeedbackItem[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
  } catch (error) {
    console.error('Error saving feedback file:', error);
  }
}

/**
 * Feedback API
 * Stores user feedback (bugs, features, general) in a local JSON file
 * 
 * POST /api/feedback
 * Body: { type: 'bug' | 'feature' | 'general', message: string, timestamp: number, userAgent?: string, url?: string }
 * Response: { success: boolean, id: string }
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, message, timestamp, userAgent, url } = body;

    // Validate required fields
    if (!type || !message || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message, timestamp' },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes = ['bug', 'feature', 'general'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type. Must be bug, feature, or general' },
        { status: 400 }
      );
    }

    // Create feedback item
    const feedbackItem: FeedbackItem = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      message,
      timestamp: new Date(timestamp).toISOString(),
      userAgent: userAgent || 'unknown',
      url: url || '',
      status: 'new',
      submittedAt: new Date().toISOString(),
    };

    // Read existing feedback and add new item
    const existingFeedback = getFeedback();
    existingFeedback.push(feedbackItem);
    
    // Save to file
    saveFeedback(existingFeedback);

    console.log('✅ Feedback stored:', feedbackItem.id, { type, message: message.slice(0, 100) });

    return NextResponse.json({
      success: true,
      id: feedbackItem.id,
      message: 'Feedback submitted successfully',
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to store feedback', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all feedback (for admin purposes)
export async function GET(req: Request) {
  try {
    const feedback = getFeedback();
    return NextResponse.json({
      success: true,
      feedback,
      count: feedback.length,
    });
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}
