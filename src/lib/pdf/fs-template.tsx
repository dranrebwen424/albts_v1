import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica', fontWeight: 'normal' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 120,
    fontSize: 10,
    color: '#555',
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingVertical: 3,
    fontSize: 9,
  },
  colNo: { width: '8%' },
  colCategory: { width: '22%' },
  colDescription: { width: '35%' },
  colAmount: { width: '35%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '45%',
  },
  signatureLine: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 4,
    fontSize: 9,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
  summaryGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#555',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryBreakdown: {
    marginTop: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    fontSize: 9,
  },
  breakdownLabel: { flex: 1 },
  breakdownAmount: { textAlign: 'right', width: 100 },
});

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface FsTemplateProps {
  eventName: string;
  departmentName: string;
  preparedBy: string;
  approvedBy?: string;
  items: Array<{ category: string; vendor: string; amount: number; date: string; type: string }>;
  totalBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  categoryBreakdown: Record<string, number>;
}

export function FsDocument({
  eventName,
  departmentName,
  preparedBy,
  approvedBy,
  items,
  totalBudget,
  totalExpenses,
  remainingBudget,
  categoryBreakdown,
}: FsTemplateProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FINANCIAL STATEMENT</Text>
          <Text style={styles.subtitle}>{departmentName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Event:</Text>
          <Text style={styles.infoValue}>{eventName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date Generated:</Text>
          <Text style={styles.infoValue}>{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalBudget + totalExpenses)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryValue}>{formatCurrency(remainingBudget)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Expense Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colCategory}>{item.category}</Text>
              <Text style={styles.colDescription}>{item.vendor || item.category}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.colNo} />
            <Text style={styles.colCategory} />
            <Text style={styles.colDescription}>TOTAL</Text>
            <Text style={styles.colAmount}>{formatCurrency(totalExpenses)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Category Summary</Text>
        <View style={styles.categoryBreakdown}>
          {Object.entries(categoryBreakdown).map(([cat, amount]) => (
            <View style={styles.breakdownRow} key={cat}>
              <Text style={styles.breakdownLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(amount)}</Text>
            </View>
          ))}
          <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: '#000', marginTop: 4, paddingTop: 4, fontWeight: 'bold' }]}>
            <Text style={styles.breakdownLabel}>Total</Text>
            <Text style={styles.breakdownAmount}>{formatCurrency(totalExpenses)}</Text>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>
              Prepared by: {preparedBy}
            </Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>
              Approved by: {approvedBy || '___________________'}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a system-generated Financial Statement. All expenses listed have been verified and approved through the official workflow.
        </Text>
      </Page>
    </Document>
  );
}
