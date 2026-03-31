import crypto from 'crypto';
import { PoolClient } from 'pg';
import { uploadInvoicePDF } from './s3.service';

interface BillingParams {
    client: PoolClient;
    merchantId: string;
    customerId: string;
    paymentId: string;
    amountTotal: number;
    merchantState: string;
    customerState: string;
}

/**
 * Generates computationally accurate GST invoices.
 * Calculates CGST/SGST vs IGST automatically.
 */
export const generateGSTInvoice = async (params: BillingParams) => {
    // 1. Core GST Logic Calculation
    // Assuming a standard 18% GST slab for SaaS/Digital goods
    const GST_RATE = 0.18;
    
    // Reverse calculating subtotal from the total paid amount
    // Total = Subtotal + (Subtotal * 0.18) => Subtotal = Total / 1.18
    const subtotal = params.amountTotal / (1 + GST_RATE);
    const taxAmount = params.amountTotal - subtotal;
    
    let cgst = 0, sgst = 0, igst = 0;

    // Intra-state vs Inter-state determination
    if (params.merchantState.toLowerCase() === params.customerState.toLowerCase()) {
        // Intra-state: Split equally between Central and State
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
    } else {
        // Inter-state: Full Integrated GST
        igst = taxAmount;
    }

    // 2. India Compliance: IRN (Invoice Reference Number) generation
    // In production, this would call the E-Invoice Govt Portal via a GSP
    // Here we simulate the cryptographic hash structure of an IRN.
    const mockNICPayload = `${params.merchantId}-${params.paymentId}-${Date.now()}`;
    const generatedIRN = crypto.createHash('sha256').update(mockNICPayload).digest('hex');

    // 3. Document Generation
    // Simulate PDF generation memory buffer
    const mockPdfBuffer = Buffer.from(`INVOICE \nIRN: ${generatedIRN}\nTotal: Rs ${params.amountTotal}`);
    const s3Key = `invoices/${params.merchantId}/${params.paymentId}.pdf`;
    
    // Upload securely to S3 with KMS encryption
    await uploadInvoicePDF(mockPdfBuffer, s3Key);

    // 4. Secure Database Insertion via the passed transaction client
    const insertQuery = `
        INSERT INTO invoices (
            merchant_id, customer_id, irn, payment_provider, payment_id,
            amount_subtotal, tax_cgst, tax_sgst, tax_igst, amount_total,
            hsn_sac_code, s3_document_key, status
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13
        ) RETURNING id, irn
    `;

    const values = [
        params.merchantId, params.customerId, generatedIRN, 'razorpay', params.paymentId,
        subtotal.toFixed(2), cgst.toFixed(2), sgst.toFixed(2), igst.toFixed(2), params.amountTotal.toFixed(2),
        '998311', // SAC code for IT services
        s3Key, 'GENERATED'
    ];

    const result = await params.client.query(insertQuery, values);

    return result.rows[0];
};
