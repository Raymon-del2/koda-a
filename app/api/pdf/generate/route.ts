import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * PDF Generation API
 * Converts HTML content to downloadable PDF using Puppeteer
 * 
 * POST /api/pdf/generate
 * Body: { html: string, filename?: string }
 * Response: { success: boolean, downloadUrl: string }
 */

export async function POST(req: Request) {
  try {
    const { html, filename } = await req.json();

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const pdfFilename = filename || `doc_${Date.now()}`;
    const sanitizedFilename = pdfFilename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfPath = path.join(process.cwd(), 'public', 'pdfs', `${sanitizedFilename}.pdf`);

    // Ensure pdfs directory exists
    const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        bottom: '40px',
        left: '40px',
        right: '40px',
      },
    });

    await browser.close();

    // Return download URL
    const downloadUrl = `/pdfs/${sanitizedFilename}.pdf`;

    console.log('✅ PDF generated:', downloadUrl);

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename: `${sanitizedFilename}.pdf`,
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: (error as Error).message },
      { status: 500 }
    );
  }
}
