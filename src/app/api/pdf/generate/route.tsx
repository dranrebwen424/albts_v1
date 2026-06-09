import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { FsDocument } from '@/lib/pdf/fs-template';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const stream = await renderToStream(
      <FsDocument
        eventName={data.eventName}
        departmentName={data.departmentName}
        preparedBy={data.preparedBy}
        approvedBy={data.approvedBy}
        items={data.items}
        totalBudget={data.totalBudget}
        totalExpenses={data.totalExpenses}
        remainingBudget={data.remainingBudget}
        categoryBreakdown={data.categoryBreakdown}
      />
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="financial-statement-${data.eventName?.replace(/\s+/g, '-').toLowerCase() || 'report'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
