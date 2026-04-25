import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Invoice } from '@/lib/supabase/types';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff', fontWeight: 600 },
  ],
});

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: '#171717', padding: '40 50', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 },
  logo: { width: 100, height: 40, objectFit: 'contain' },
  invoiceLabel: { fontSize: 24, fontWeight: 600, color: '#171717', textAlign: 'right' },
  invoiceNumber: { fontSize: 11, color: '#737373', textAlign: 'right', marginTop: 4 },
  section: { marginBottom: 24 },
  label: { fontSize: 9, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  value: { fontSize: 11, color: '#171717' },
  row2: { flexDirection: 'row', gap: 40 },
  divider: { borderBottom: '1 solid #e5e5e5', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f3', padding: '8 10', marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '8 10', borderBottom: '1 solid #f0f0f0' },
  colDesc: { flex: 3, fontSize: 10 },
  colQty: { flex: 1, textAlign: 'center', fontSize: 10 },
  colPrice: { flex: 1, textAlign: 'right', fontSize: 10 },
  colAmt: { flex: 1, textAlign: 'right', fontSize: 10 },
  colHeaderText: { fontSize: 9, fontWeight: 600, color: '#737373', textTransform: 'uppercase' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  totalsLabel: { fontSize: 10, color: '#737373', width: 100, textAlign: 'right', marginRight: 20 },
  totalsValue: { fontSize: 10, width: 80, textAlign: 'right' },
  totalFinal: { fontWeight: 600, fontSize: 12, color: '#171717' },
  notes: { marginTop: 24, padding: 14, backgroundColor: '#f5f5f3', borderRadius: 6 },
  notesText: { fontSize: 10, color: '#525252', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, borderTop: '1 solid #e5e5e5', paddingTop: 10 },
  footerText: { fontSize: 9, color: '#a3a3a3', textAlign: 'center' },
});

function money(n: number) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function InvoicePDFDocument({ invoice }: { invoice: Invoice }) {
  const logoUrl = `${window.location.origin}/seka-logo.png`;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image src={logoUrl} style={s.logo} />
          <View>
            <Text style={s.invoiceLabel}>Invoice</Text>
            <Text style={s.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={[s.invoiceNumber, { marginTop: 2 }]}>
              {new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={s.section}>
          <View style={s.row2}>
            <View>
              <Text style={s.label}>Bill To</Text>
              <Text style={s.value}>{invoice.customer_name}</Text>
              {invoice.customer_email && <Text style={[s.value, { color: '#737373', marginTop: 2 }]}>{invoice.customer_email}</Text>}
            </View>
            {invoice.job_number && (
              <View>
                <Text style={s.label}>Job #</Text>
                <Text style={s.value}>{invoice.job_number}</Text>
              </View>
            )}
            <View>
              <Text style={s.label}>From</Text>
              <Text style={s.value}>Seka Moving</Text>
              <Text style={[s.value, { color: '#737373', marginTop: 2 }]}>info@sekamoving.com</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Line Items Table */}
        <View style={s.tableHeader}>
          <Text style={[s.colDesc, s.colHeaderText]}>Description</Text>
          <Text style={[s.colQty, s.colHeaderText]}>Qty</Text>
          <Text style={[s.colPrice, s.colHeaderText]}>Unit Price</Text>
          <Text style={[s.colAmt, s.colHeaderText]}>Amount</Text>
        </View>
        {invoice.line_items.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.colDesc}>{item.description}</Text>
            <Text style={s.colQty}>{item.quantity}</Text>
            <Text style={s.colPrice}>{money(item.unit_price)}</Text>
            <Text style={s.colAmt}>{money(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={{ marginTop: 12 }}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{money(invoice.subtotal)}</Text>
          </View>
          {invoice.tax_pct > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Tax ({invoice.tax_pct}%)</Text>
              <Text style={s.totalsValue}>{money(invoice.subtotal * invoice.tax_pct / 100)}</Text>
            </View>
          )}
          <View style={[s.totalsRow, { marginTop: 6 }]}>
            <Text style={[s.totalsLabel, s.totalFinal]}>Total</Text>
            <Text style={[s.totalsValue, s.totalFinal]}>{money(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={s.notes}>
            <Text style={[s.label, { marginBottom: 6 }]}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Seka Moving · Thank you for your business</Text>
        </View>
      </Page>
    </Document>
  );
}
