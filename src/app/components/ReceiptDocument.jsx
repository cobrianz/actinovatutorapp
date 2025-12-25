import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Clean, professional styles – optimized for one page
const styles = StyleSheet.create({
  page: {
    paddingVertical: 50,
    paddingHorizontal: 60,
    fontFamily: 'Helvetica',
    fontSize: 11,
    backgroundColor: '#ffffff',
  },

  // Blue header bar
  header: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 30,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },

  // Company info
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 12,
  },
  website: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666666',
    marginBottom: 30,
  },

  thankYou: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  accentLine: {
    height: 1.8,
    backgroundColor: '#00A8FF',
    width: '40%',
    alignSelf: 'center',
    marginBottom: 35,
  },

  // Two-column transaction details
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 35,
  },
  column: {
    width: '48%',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    width: 125,
    color: '#333333',
  },
  value: {
    color: '#444444',
    flex: 1,
  },
  success: {
    color: '#006400',
    fontWeight: 'bold',
  },

  // Clean table – blue header only, no row backgrounds
  table: {
    width: '100%',
    border: '1px solid #0066CC',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeader: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 45,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cellDesc: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 11.5,
  },
  cellAmount: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    textAlign: 'right',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  totalRow: {
    borderBottomWidth: 0,
    backgroundColor: '#f8fbff', // Very light highlight for total
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Footer – no check icon
  footer: {
    alignItems: 'center',
  },
  processed: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  note: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  contact: {
    fontSize: 11,
    color: '#444444',
    marginBottom: 25,
    textAlign: 'center',
  },
  footerLine: {
    height: 1.8,
    backgroundColor: '#00A8FF',
    width: '70%',
    marginVertical: 18,
  },
  closing: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});

const ReceiptDocument = ({ transaction }) => {
  const paidDate = new Date(transaction.paidAt || transaction.date);
  const dateStr = paidDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = paidDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine amount and currency
  // Prioritize USD from metadata if available (to show standard $ price)
  let rawAmount = transaction.metadata?.usdAmount
    ? transaction.metadata.usdAmount
    : (transaction.amount || 0);

  // If using generic amount, ensure we don't divide by 100 if it's already main units (DB saves main units)
  // Previous code divided by 100, assuming cents. We remove that.

  let currency = transaction.metadata?.usdAmount ? 'USD' : (transaction.currency || transaction.metadata?.currency || 'USD');

  // If payment was Mobile Money but we want to show $ (usdAmount present), we use USD. 
  // Otherwise respect transaction.currency (e.g. KES).
  // User explicitly asked "fix the currency in the receipt to be in $".

  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(rawAmount);

  const planName = transaction.plan
    ? transaction.plan.charAt(0).toUpperCase() + transaction.plan.slice(1)
    : 'Pro';

  const isMobileMoney = transaction.metadata?.paymentMethod === 'mobile_money' || transaction.currency === 'KES';

  const paymentMethodDisplay = isMobileMoney
    ? 'Mobile Money (M-Pesa)'
    : 'Credit/Debit Card';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>PAYMENT RECEIPT</Text>
        </View>

        {/* Company Info */}
        <Text style={styles.title}>Actinova AI Tutor</Text>
        <Text style={styles.tagline}>Your Intelligent Learning Companion</Text>
        <Text style={styles.website}>www.actinova.ai</Text>

        <Text style={styles.thankYou}>Thank you for your subscription!</Text>
        <View style={styles.accentLine} />

        {/* Transaction Details */}
        <View style={styles.detailsGrid}>
          <View style={styles.column}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Transaction Date:</Text>
              <Text style={styles.value}>{dateStr}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Receipt Number:</Text>
              <Text style={styles.value}>{transaction.transactionId || '5659097327'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Reference:</Text>
              <Text style={styles.value}>{transaction.reference || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Payment Status:</Text>
              <Text style={[styles.value, styles.success]}>SUCCESS</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Payment Method:</Text>
              <Text style={styles.value}>{paymentMethodDisplay}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Plan:</Text>
              <Text style={styles.value}>{planName} Subscription</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>Active</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Auto-Renew:</Text>
              <Text style={styles.value}>
                {transaction.subscription?.autoRenew ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Valid From:</Text>
              <Text style={styles.value}>{dateStr}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.cellDesc}>{planName} Subscription Plan</Text>
            <Text style={styles.cellAmount}>{amount}</Text>
          </View>

          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.cellDesc, styles.totalLabel]}>Total Paid</Text>
            <Text style={[styles.cellAmount, styles.totalLabel]}>{amount}</Text>
          </View>
        </View>

        {/* Footer – no check icon */}
        <View style={styles.footer}>
          <Text style={styles.processed}>
            Payment processed on {dateStr} at {timeStr} EAT
          </Text>
          <Text style={styles.note}>
            This is an auto-generated receipt. No signature required.
          </Text>
          <Text style={styles.contact}>
            Questions? Contact us at support@actinova.ai
          </Text>
          <View style={styles.footerLine} />
          <Text style={styles.closing}>
            Thank you for choosing Actinova AI Tutor!
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptDocument;