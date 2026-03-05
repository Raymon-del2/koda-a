/**
 * Report Generation Engine
 * 
 * Generates downloadable reports in multiple formats:
 * - PDF: Weekly/monthly summaries, governance reports
 * - CSV: Structured data exports, metrics logs
 * - JSON: Machine-readable API responses, full trace data
 * 
 * All reports include timestamps and are stored temporarily
 * with signed download links that expire for security.
 */

import { queryTraces, calculateCognitiveTrustIndex, type ActionTrace } from './production-governance';
import { getObservabilityData, getCognitiveIdentity, runWeeklyReflection } from './observability';
import { getRealityAnchorStatus } from './reality-anchors';
import { goalManager } from './goal-hierarchy';
import { toolRegistry } from './tool-framework';
import { metricsStore } from './adaptive-intelligence';
import { explorationState } from './exploration-engine';
import { energyTracker } from './cognitive-energy';
import { checkSystemCapabilities } from './capability-registry';

// ==========================================
// REPORT TYPES & CONFIGURATION
// ==========================================

export type ReportFormat = 'pdf' | 'csv' | 'json';
export type ReportType = 
  | 'weekly-governance'
  | 'daily-metrics'
  | 'interaction-trace'
  | 'cognitive-identity'
  | 'full-system';

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  timeRange?: {
    start: number;
    end: number;
  };
  options?: {
    includeTraces?: boolean;
    includeIdentity?: boolean;
    includeGoals?: boolean;
    anonymize?: boolean;
  };
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: number;
  expiresAt: number;
  filePath: string;
  fileSize: number;
  content: string | Buffer; // For PDF this would be Buffer
  metadata: {
    recordCount: number;
    timeRange: { start: number; end: number };
    generatedBy: string;
  };
}

// In-memory report store (would be file system or S3 in production)
const reportStore = new Map<string, GeneratedReport>();
const REPORT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ==========================================
// REPORT DATA COLLECTION
// ==========================================

interface ReportData {
  timestamp: number;
  reportType: ReportType;
  
  // System Overview
  system: {
    healthScore: number;
    mode: string;
    cognitiveTrustIndex: ReturnType<typeof calculateCognitiveTrustIndex>;
    totalInteractions: number;
  };
  
  // Cognitive Identity
  identity?: {
    phase: string;
    trajectory: string;
    strengths: string[];
    weaknesses: string[];
    confidenceBias: number;
    learningPhase: string;
  };
  
  // Governance
  governance?: {
    realityAnchors: ReturnType<typeof getRealityAnchorStatus>;
    goals: ReturnType<typeof goalManager.getActiveGoals>;
    explorationRate: number;
    energyMetrics: ReturnType<typeof energyTracker.getMetrics>;
  };
  
  // Tools & Capabilities
  capabilities?: ReturnType<typeof checkSystemCapabilities>;
  toolStats?: ReturnType<typeof toolRegistry.getStats>;
  
  // Traces (if requested)
  traces?: ActionTrace[];
  
  // Weekly reflection (if available)
  weeklyReflection?: Awaited<ReturnType<typeof runWeeklyReflection>>;
}

/**
 * Collect all data needed for a report
 */
async function collectReportData(
  type: ReportType,
  timeRange: { start: number; end: number },
  options: ReportRequest['options']
): Promise<ReportData> {
  const obs = getObservabilityData();
  const identity = getCognitiveIdentity();
  const trustIndex = calculateCognitiveTrustIndex(100);
  
  const data: ReportData = {
    timestamp: Date.now(),
    reportType: type,
    system: {
      healthScore: obs.healthScore,
      mode: obs.derived.plannerStability.trend,
      cognitiveTrustIndex: trustIndex,
      totalInteractions: obs.snapshot.totalInteractions,
    },
  };
  
  if (options?.includeIdentity !== false) {
    data.identity = {
      phase: identity.learningPhase,
      trajectory: identity.improvementTrajectory,
      strengths: identity.strengths,
      weaknesses: identity.weaknesses,
      confidenceBias: identity.confidenceBias,
      learningPhase: identity.learningPhase,
    };
  }
  
  if (options?.includeGoals !== false) {
    data.governance = {
      realityAnchors: getRealityAnchorStatus(),
      goals: goalManager.getActiveGoals(),
      explorationRate: explorationState.explorationRate,
      energyMetrics: energyTracker.getMetrics(),
    };
  }
  
  data.capabilities = checkSystemCapabilities();
  data.toolStats = toolRegistry.getStats();
  
  if (options?.includeTraces) {
    data.traces = queryTraces({
      timeRange,
      limit: 1000,
    });
  }
  
  // Weekly reflection for weekly reports
  if (type === 'weekly-governance') {
    try {
      data.weeklyReflection = await runWeeklyReflection();
    } catch (e) {
      console.log('Weekly reflection not available for report');
    }
  }
  
  return data;
}

// ==========================================
// FORMAT GENERATORS
// ==========================================

/**
 * Generate JSON format report
 */
function generateJSON(data: ReportData, options?: { anonymize?: boolean }): string {
  let exportData = { ...data };
  
  if (options?.anonymize && exportData.traces) {
    exportData.traces = exportData.traces.map(t => ({
      ...t,
      sessionId: 'ANON_' + t.sessionId.slice(0, 8),
      userQuery: t.userQuery.slice(0, 50) + '...',
    }));
  }
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate CSV format report
 */
function generateCSV(data: ReportData): string {
  const lines: string[] = [];
  
  // Header section
  lines.push('NYATI GOVERNANCE REPORT');
  lines.push(`Generated,${new Date(data.timestamp).toISOString()}`);
  lines.push(`Report Type,${data.reportType}`);
  lines.push('');
  
  // System Overview
  lines.push('SYSTEM OVERVIEW');
  lines.push(`Health Score,${data.system.healthScore}`);
  lines.push(`Mode,${data.system.mode}`);
  lines.push(`Cognitive Trust Index,${data.system.cognitiveTrustIndex.score.toFixed(2)}`);
  lines.push(`Trust Level,${data.system.cognitiveTrustIndex.trustLevel}`);
  lines.push(`Total Interactions,${data.system.totalInteractions}`);
  lines.push('');
  
  // Identity
  if (data.identity) {
    lines.push('COGNITIVE IDENTITY');
    lines.push(`Phase,${data.identity.phase}`);
    lines.push(`Trajectory,${data.identity.trajectory}`);
    lines.push(`Confidence Bias,${data.identity.confidenceBias.toFixed(3)}`);
    lines.push(`Strengths,"${data.identity.strengths.join(', ')}"`);
    lines.push(`Weaknesses,"${data.identity.weaknesses.join(', ')}"`);
    lines.push('');
  }
  
  // Goals
  if (data.governance?.goals) {
    lines.push('ACTIVE GOALS');
    lines.push('Name,Level,Status,Current,Target');
    data.governance.goals.forEach(g => {
      lines.push(`${g.name},${g.level},${g.status},${g.currentValue?.toFixed(2) || 'N/A'},${g.targetValue?.toFixed(2) || 'N/A'}`);
    });
    lines.push('');
  }
  
  // Reality Anchors
  if (data.governance?.realityAnchors) {
    lines.push('REALITY ANCHORS');
    lines.push(`User Confusion,${(data.governance.realityAnchors.userConfusion * 100).toFixed(1)}%`);
    lines.push(`Outcome Health,${data.governance.realityAnchors.outcomeHealth}`);
    lines.push(`Novelty Health,${data.governance.realityAnchors.noveltyHealth}`);
    lines.push(`Anchor Status,${data.governance.realityAnchors.anchorStatus}`);
    lines.push('');
  }
  
  // Tools
  if (data.toolStats) {
    lines.push('TOOL STATISTICS');
    lines.push(`Total Executions,${data.toolStats.totalExecutions}`);
    lines.push('Tool,Executions,Success Rate');
    Object.entries(data.toolStats.byTool).forEach(([tool, stats]) => {
      lines.push(`${tool},${stats.executions},${(stats.successRate * 100).toFixed(1)}%`);
    });
    lines.push('');
  }
  
  // Traces (summary only for CSV)
  if (data.traces && data.traces.length > 0) {
    lines.push('INTERACTION TRACES (Last 100)');
    lines.push('ID,Timestamp,Intent,Success,Exploration,Confidence,Time(ms)');
    data.traces.slice(-100).forEach(t => {
      lines.push(`${t.interactionId.slice(0, 8)},${new Date(t.timestamp).toISOString()},${t.decisions.plan.intent},${t.outcome.success},${t.decisions.explorationTriggered},${t.outcome.confidence.toFixed(2)},${t.execution.generationTimeMs}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Generate PDF format report (text-based for now)
 * In production, this would use a PDF library like pdf-lib or puppeteer
 */
function generatePDF(data: ReportData): string {
  // For now, generate a formatted text report that can be printed to PDF
  const lines: string[] = [];
  
  // Title Page
  lines.push('='.repeat(80));
  lines.push('NYATI GOVERNANCE REPORT'.padStart(50));
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Report Type: ${data.reportType.toUpperCase()}`);
  lines.push(`Generated: ${new Date(data.timestamp).toLocaleString()}`);
  lines.push(`Data Range: ${data.system.totalInteractions} total interactions`);
  lines.push('');
  
  // Executive Summary
  lines.push('─'.repeat(80));
  lines.push('EXECUTIVE SUMMARY');
  lines.push('─'.repeat(80));
  lines.push('');
  
  const trust = data.system.cognitiveTrustIndex;
  lines.push(`Cognitive Trust Index: ${trust.score.toFixed(1)}/100 (${trust.trustLevel.toUpperCase()})`);
  lines.push(`Trend: ${trust.trend.toUpperCase()}`);
  lines.push('');
  lines.push('Component Scores:');
  lines.push(`  Correctness:        ${trust.components.correctness.toFixed(1)}%`);
  lines.push(`  Consistency:      ${trust.components.consistency.toFixed(1)}%`);
  lines.push(`  Clarity:           ${trust.components.clarity.toFixed(1)}%`);
  lines.push(`  Latency Stability: ${trust.components.latencyStability.toFixed(1)}%`);
  lines.push(`  Continuation Rate: ${trust.components.continuationRate.toFixed(1)}%`);
  lines.push('');
  
  // System Health
  lines.push('─'.repeat(80));
  lines.push('SYSTEM HEALTH');
  lines.push('─'.repeat(80));
  lines.push('');
  lines.push(`Overall Health Score: ${data.system.healthScore}/100`);
  lines.push(`System Mode: ${data.system.mode}`);
  lines.push('');
  
  // Identity
  if (data.identity) {
    lines.push('─'.repeat(80));
    lines.push('COGNITIVE IDENTITY');
    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(`Learning Phase: ${data.identity.learningPhase}`);
    lines.push(`Trajectory: ${data.identity.trajectory}`);
    lines.push(`Confidence Bias: ${data.identity.confidenceBias > 0 ? '+' : ''}${data.identity.confidenceBias.toFixed(3)}`);
    lines.push('');
    lines.push('Strengths:');
    data.identity.strengths.forEach(s => lines.push(`  • ${s}`));
    lines.push('');
    lines.push('Areas for Improvement:');
    data.identity.weaknesses.forEach(w => lines.push(`  • ${w}`));
    lines.push('');
  }
  
  // Goals
  if (data.governance?.goals) {
    lines.push('─'.repeat(80));
    lines.push('GOAL HIERARCHY');
    lines.push('─'.repeat(80));
    lines.push('');
    
    const byLevel = {
      core: data.governance.goals.filter(g => g.level === 'core'),
      strategic: data.governance.goals.filter(g => g.level === 'strategic'),
      operational: data.governance.goals.filter(g => g.level === 'operational'),
    };
    
    Object.entries(byLevel).forEach(([level, goals]) => {
      if (goals.length > 0) {
        lines.push(`${level.toUpperCase()} GOALS:`);
        goals.forEach(g => {
          const progress = g.currentValue && g.targetValue 
            ? `${(g.currentValue / g.targetValue * 100).toFixed(0)}%`
            : 'N/A';
          lines.push(`  • ${g.name}`);
          lines.push(`    Status: ${g.status} | Progress: ${progress}`);
        });
        lines.push('');
      }
    });
  }
  
  // Reality Anchors
  if (data.governance?.realityAnchors) {
    lines.push('─'.repeat(80));
    lines.push('REALITY ANCHORS');
    lines.push('─'.repeat(80));
    lines.push('');
    const ra = data.governance.realityAnchors;
    lines.push(`User Confusion Rate: ${(ra.userConfusion * 100).toFixed(1)}%`);
    lines.push(`Outcome Health: ${ra.outcomeHealth}`);
    lines.push(`Novelty Health: ${ra.noveltyHealth}`);
    lines.push(`Overall Anchor Status: ${ra.anchorStatus.toUpperCase()}`);
    lines.push('');
  }
  
  // Weekly Reflection
  if (data.weeklyReflection) {
    lines.push('─'.repeat(80));
    lines.push('WEEKLY INTELLIGENCE CYCLE');
    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(`Changes This Week: ${data.weeklyReflection.changes.length}`);
    data.weeklyReflection.changes.forEach(c => lines.push(`  • ${c}`));
    lines.push('');
  }
  
  // Tools
  if (data.toolStats) {
    lines.push('─'.repeat(80));
    lines.push('TOOL FRAMEWORK STATUS');
    lines.push('─'.repeat(80));
    lines.push('');
    lines.push(`Total Executions: ${data.toolStats.totalExecutions}`);
    lines.push('');
    lines.push('Tool Performance:');
    Object.entries(data.toolStats.byTool).forEach(([tool, stats]) => {
      lines.push(`  ${tool}: ${stats.executions} executions, ${(stats.successRate * 100).toFixed(1)}% success`);
    });
    lines.push('');
  }
  
  // Capabilities
  if (data.capabilities) {
    lines.push('─'.repeat(80));
    lines.push('SYSTEM CAPABILITIES');
    lines.push('─'.repeat(80));
    lines.push('');
    
    const allCaps = [
      ...data.capabilities.reasoning,
      ...data.capabilities.memory,
      ...data.capabilities.tools,
    ];
    
    const available = allCaps.filter(c => c.available);
    const restricted = allCaps.filter(c => c.available && c.restricted);
    const unavailable = allCaps.filter(c => !c.available);
    
    lines.push(`Available: ${available.length} | Restricted: ${restricted.length} | Unavailable: ${unavailable.length}`);
    lines.push('');
    
    if (unavailable.length > 0) {
      lines.push('Currently Unavailable:');
      unavailable.forEach(c => lines.push(`  • ${c.name}`));
      lines.push('');
    }
  }
  
  // Footer
  lines.push('');
  lines.push('='.repeat(80));
  lines.push('END OF REPORT');
  lines.push(`Report ID: ${data.timestamp.toString(36).toUpperCase()}`);
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

// ==========================================
// REPORT GENERATION API
// ==========================================

/**
 * Generate a report
 */
export async function generateReport(
  request: ReportRequest
): Promise<GeneratedReport> {
  const reportId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const generatedAt = Date.now();
  const expiresAt = generatedAt + REPORT_EXPIRY_MS;
  
  // Determine time range
  const timeRange = request.timeRange || {
    start: generatedAt - 7 * 24 * 60 * 60 * 1000, // Default 7 days
    end: generatedAt,
  };
  
  // Collect data
  const data = await collectReportData(request.type, timeRange, request.options);
  
  // Generate content based on format
  let content: string | Buffer;
  let fileSize: number;
  let recordCount = 0;
  
  switch (request.format) {
    case 'json':
      content = generateJSON(data, { anonymize: request.options?.anonymize });
      fileSize = Buffer.byteLength(content, 'utf-8');
      recordCount = data.traces?.length || 0;
      break;
      
    case 'csv':
      content = generateCSV(data);
      fileSize = Buffer.byteLength(content, 'utf-8');
      recordCount = data.traces?.length || 0;
      break;
      
    case 'pdf':
      content = generatePDF(data);
      fileSize = Buffer.byteLength(content, 'utf-8');
      recordCount = data.traces?.length || 0;
      break;
      
    default:
      throw new Error(`Unsupported format: ${request.format}`);
  }
  
  const report: GeneratedReport = {
    id: reportId,
    type: request.type,
    format: request.format,
    generatedAt,
    expiresAt,
    filePath: `/reports/${reportId}.${request.format}`,
    fileSize,
    content,
    metadata: {
      recordCount,
      timeRange,
      generatedBy: 'system',
    },
  };
  
  // Store report
  reportStore.set(reportId, report);
  
  console.log('📊 Report generated:', {
    id: reportId,
    type: request.type,
    format: request.format,
    size: fileSize,
    records: recordCount,
  });
  
  return report;
}

/**
 * Get a report by ID
 */
export function getReport(reportId: string): GeneratedReport | null {
  const report = reportStore.get(reportId);
  
  if (!report) return null;
  
  // Check expiry
  if (Date.now() > report.expiresAt) {
    reportStore.delete(reportId);
    return null;
  }
  
  return report;
}

/**
 * List all active reports
 */
export function listReports(): Array<{
  id: string;
  type: ReportType;
  format: ReportFormat;
  generatedAt: number;
  expiresAt: number;
  fileSize: number;
}> {
  const now = Date.now();
  const reports: ReturnType<typeof listReports> = [];
  
  for (const [id, report] of reportStore.entries()) {
    if (now <= report.expiresAt) {
      reports.push({
        id,
        type: report.type,
        format: report.format,
        generatedAt: report.generatedAt,
        expiresAt: report.expiresAt,
        fileSize: report.fileSize,
      });
    } else {
      reportStore.delete(id);
    }
  }
  
  return reports.sort((a, b) => b.generatedAt - a.generatedAt);
}

/**
 * Cleanup expired reports
 */
export function cleanupExpiredReports(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, report] of reportStore.entries()) {
    if (now > report.expiresAt) {
      reportStore.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}
