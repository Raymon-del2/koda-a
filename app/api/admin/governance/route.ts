import { NextResponse } from 'next/server';
import { 
  getGovernanceStatus, 
  HARD_GUARDRAILS,
  enforceGuardrails,
  checkSafeModeTrigger,
  enterSafeMode,
  exitSafeMode,
  getSafeModeStatus,
  queryTraces,
  explainDecision,
  calculateCognitiveTrustIndex,
  type GovernanceStatus,
} from '@/lib/production-governance';

/**
 * Production Governance Dashboard API
 * 
 * GET  /api/admin/governance - Full governance status
 * POST /api/admin/governance - Admin actions (safe mode, etc.)
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (action === 'traces') {
      // Query action traces
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const failedOnly = url.searchParams.get('failed') === 'true';
      const explorationOnly = url.searchParams.get('exploration') === 'true';
      
      const traces = queryTraces({
        limit,
        failedOnly,
        explorationOnly,
      });
      
      return NextResponse.json({
        success: true,
        data: {
          traces: traces.map(t => ({
            interactionId: t.interactionId,
            timestamp: t.timestamp,
            mode: t.system.mode,
            intent: t.decisions.plan.intent,
            success: t.outcome.success,
            exploration: t.decisions.explorationTriggered,
            confidence: t.outcome.confidence,
            generationTimeMs: t.execution.generationTimeMs,
          })),
          count: traces.length,
        },
      });
    }
    
    if (action === 'explain') {
      // Explain a specific decision
      const interactionId = url.searchParams.get('id');
      if (!interactionId) {
        return NextResponse.json(
          { success: false, error: 'Missing interaction ID' },
          { status: 400 }
        );
      }
      
      const explanation = explainDecision(interactionId);
      
      return NextResponse.json({
        success: true,
        data: { explanation },
      });
    }
    
    if (action === 'guardrails') {
      // Get guardrail status
      const guardrailStatus = enforceGuardrails();
      
      return NextResponse.json({
        success: true,
        data: {
          hardGuardrails: HARD_GUARDRAILS,
          currentStatus: guardrailStatus,
        },
      });
    }
    
    // Default: full governance status
    const status = getGovernanceStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Governance API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch governance status' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { action, reason } = await req.json();
    
    if (action === 'enter-safe-mode') {
      const check = checkSafeModeTrigger();
      enterSafeMode(reason || 'Manual admin trigger', check.severity);
      
      return NextResponse.json({
        success: true,
        data: {
          mode: 'safe',
          triggeredAt: Date.now(),
          reason: reason || 'Manual admin trigger',
        },
      });
    }
    
    if (action === 'exit-safe-mode') {
      exitSafeMode();
      
      return NextResponse.json({
        success: true,
        data: {
          mode: 'normal',
          previousMode: getSafeModeStatus().previousMode,
        },
      });
    }
    
    if (action === 'force-guardrail-check') {
      const result = enforceGuardrails();
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    if (action === 'calculate-trust-index') {
      const windowSize = parseInt(reason || '100'); // reason param used as window size
      const index = calculateCognitiveTrustIndex(windowSize);
      
      return NextResponse.json({
        success: true,
        data: index,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Governance POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    );
  }
}
