import { NextResponse } from 'next/server';
import { getObservabilityData, runWeeklyReflection, generateDashboardData } from '@/lib/observability';

/**
 * Nyati Observability Dashboard API
 * 
 * GET /api/admin/dashboard - Get real-time system telemetry
 * POST /api/admin/dashboard - Trigger weekly reflection
 */

export async function GET() {
  try {
    const data = getObservabilityData();
    
    return NextResponse.json({
      success: true,
      data: {
        // Real-time snapshot
        snapshot: data.snapshot,
        
        // Intelligence metrics
        derived: data.derived,
        
        // Intent breakdown
        intents: data.intents,
        
        // System health
        healthScore: data.healthScore,
        alerts: data.alerts,
        
        // Cognitive identity
        identity: {
          version: data.identity.version,
          phase: data.identity.learningPhase,
          trajectory: data.identity.improvementTrajectory,
          strengths: data.identity.strengths,
          weaknesses: data.identity.weaknesses,
          confidenceBias: data.identity.confidenceBias,
          selfSummary: data.identity.selfSummary,
          intentProficiency: data.identity.intentProficiency,
          lastUpdated: data.identity.lastUpdated,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate dashboard data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    
    if (action === 'weekly-reflection') {
      const result = await runWeeklyReflection();
      
      return NextResponse.json({
        success: true,
        data: {
          changes: result.changes,
          newPhase: result.identity.learningPhase,
          newTrajectory: result.identity.improvementTrajectory,
          confidenceBias: result.identity.confidenceBias,
        },
      });
    }
    
    if (action === 'refresh-metrics') {
      const data = generateDashboardData();
      
      return NextResponse.json({
        success: true,
        data,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Dashboard POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    );
  }
}
