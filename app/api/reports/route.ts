import { NextResponse } from 'next/server';
import { 
  generateReport, 
  getReport, 
  listReports, 
  cleanupExpiredReports,
  type ReportRequest,
} from '@/lib/report-engine';

/**
 * Report Download API
 * 
 * GET  /api/reports          - List available reports
 * POST /api/reports          - Generate new report
 * GET  /api/reports?id=<id>  - Download specific report
 * DELETE /api/reports?id=<id> - Delete report
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    const action = url.searchParams.get('action');
    
    // List all reports
    if (!reportId && action !== 'download') {
      const reports = listReports();
      
      return NextResponse.json({
        success: true,
        data: {
          reports: reports.map(r => ({
            id: r.id,
            type: r.type,
            format: r.format,
            generatedAt: r.generatedAt,
            expiresAt: r.expiresAt,
            fileSize: r.fileSize,
            downloadUrl: `/api/reports?id=${r.id}&action=download`,
          })),
          count: reports.length,
        },
      });
    }
    
    // Download specific report
    if (reportId) {
      const report = getReport(reportId);
      
      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Report not found or expired' },
          { status: 404 }
        );
      }
      
      // Return as downloadable file
      const contentType = 
        report.format === 'pdf' ? 'text/plain' : // Would be application/pdf with proper PDF lib
        report.format === 'csv' ? 'text/csv' :
        'application/json';
      
      const filename = `nyati-${report.type}-${new Date(report.generatedAt).toISOString().split('T')[0]}.${report.format}`;
      
      // Convert content to Uint8Array for proper response handling
      const content = typeof report.content === 'string' 
        ? new TextEncoder().encode(report.content)
        : new Uint8Array(report.content);
      
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': report.fileSize.toString(),
          'X-Report-Id': report.id,
          'X-Report-Type': report.type,
          'X-Report-Generated': report.generatedAt.toString(),
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request
    if (!body.type || !body.format) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, format' },
        { status: 400 }
      );
    }
    
    const request: ReportRequest = {
      type: body.type,
      format: body.format,
      timeRange: body.timeRange,
      options: body.options,
    };
    
    // Generate report
    const report = await generateReport(request);
    
    return NextResponse.json({
      success: true,
      data: {
        report: {
          id: report.id,
          type: report.type,
          format: report.format,
          generatedAt: report.generatedAt,
          expiresAt: report.expiresAt,
          fileSize: report.fileSize,
          recordCount: report.metadata.recordCount,
        },
        downloadUrl: `/api/reports?id=${report.id}&action=download`,
        message: `Report generated successfully. Available for 24 hours.`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');
    
    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Missing report ID' },
        { status: 400 }
      );
    }
    
    // Cleanup specific report would require tracking deletion
    // For now, just trigger general cleanup
    const cleaned = cleanupExpiredReports();
    
    return NextResponse.json({
      success: true,
      data: {
        cleaned,
        message: `${cleaned} expired reports cleaned up`,
      },
    });
  } catch (error) {
    console.error('Report cleanup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clean up reports' },
      { status: 500 }
    );
  }
}
