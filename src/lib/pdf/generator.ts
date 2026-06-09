export async function generateFinancialReport(reportData: {
  eventName: string;
  departmentName: string;
  items: Array<{ category: string; vendor: string; amount: number; date: string; type: string }>;
  totalBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  preparedBy: string;
  approvedBy?: string;
  categoryBreakdown: Record<string, number>;
}) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) throw new Error('PDF generation failed');

  const blob = await response.blob();
  return blob;
}
