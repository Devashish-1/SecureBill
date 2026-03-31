import crypto from 'crypto';
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { generateGSTInvoice } from '../services/billing.service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const getInvoices = async (req: Request, res: Response) => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT invoices.id, irn, invoices.created_at as date, customers.name as customer, amount_total as amount, status 
                FROM invoices 
                JOIN customers ON invoices.customer_id = customers.id
                ORDER BY invoices.created_at DESC
            `);
            return res.status(200).json(result.rows);
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error('Error fetching invoices:', err);
        return res.status(500).json({ error: 'Database connection failed.' });
    }
}

export const razorpayWebhookIngest = async (req: Request, res: Response) => {
  try {
    const isSimulated = process.env.SIMULATION_MODE === 'true';
    
    // In Production: Cryptographic Verification
    if (!isSimulated) {
        const webhookSignature = req.headers['x-razorpay-signature'] as string;
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
          throw new Error("CRITICAL: Webhook secret not configured. Potential KMS lookup failure.");
        }

        const generatedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (generatedSignature !== webhookSignature) {
          console.error('ALERT: Razorpay Webhook Invalid Signature detected.');
          return res.status(400).json({ error: 'Invalid signature. Audit log generated.' });
        }
    } else {
        console.log('[SIMILATION] Skipping HMAC Webhook Signature Verification.');
    }

    const event = req.body;
    
    // Process paid events
    if (event.event === 'order.paid' || event.event === 'payment.captured' || isSimulated) {
      // In simulation mode, mock the payload if not provided
      const paymentEntity = event?.payload?.payment?.entity || {
          id: `pay_sim_${Date.now()}`,
          amount: 500000, // 5000 INR
          currency: 'INR',
          email: 'simulated@customer.com',
          contact: '+919876543210',
          notes: { account_id: 'merch_1029381' }
      };
      
      const paymentId = paymentEntity.id;
      const amount = paymentEntity.amount / 100;
      const currency = paymentEntity.currency;
      const merchantAccountId = paymentEntity.notes?.account_id || 'merch_1029381'; 
      const customerEmail = paymentEntity.email;
      const customerPhone = paymentEntity.contact;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if DB has data, if not (e.g. fresh local DB), seed a dummy merchant.
        let merchantRes = await client.query(
          'SELECT id, gstin FROM merchants WHERE razorpay_account_id = $1',
          [merchantAccountId]
        );
        
        if (merchantRes.rows.length === 0) {
            console.log('[SIMULATION] Seeding mock Merchant into DB...');
            merchantRes = await client.query(
                `INSERT INTO merchants (business_name, email, phone, gstin, razorpay_account_id) 
                 VALUES ('SecureBill Test Corp', 'admin@sb.com', '+9100000000', '29AXXXX0000X1Z5', $1) RETURNING id, gstin`,
                [merchantAccountId]
            );
        }
        
        const merchant = merchantRes.rows[0];

        let customerRes = await client.query(
          'SELECT id FROM customers WHERE email = $1 AND merchant_id = $2',
          [customerEmail, merchant.id]
        );

        let customerId;
        if (customerRes.rows.length === 0) {
           const insertCust = await client.query(
             'INSERT INTO customers (merchant_id, name, email, phone, billing_state) VALUES ($1, $2, $3, $4, $5) RETURNING id',
             [merchant.id, 'Simulated Customer', customerEmail, customerPhone, 'Karnataka']
           );
           customerId = insertCust.rows[0].id;
        } else {
           customerId = customerRes.rows[0].id;
        }

        const invoiceData = await generateGSTInvoice({
            client,
            merchantId: merchant.id,
            customerId: customerId,
            paymentId: paymentId,
            amountTotal: amount,
            merchantState: 'Karnataka', 
            customerState: 'Karnataka'
        });

        await client.query('COMMIT');
        
        return res.status(200).json({ 
            success: true, 
            message: 'Webhook processed, invoice generated natively.',
            irn: invoiceData.irn
        });

      } catch (dbError) {
        await client.query('ROLLBACK');
        console.error("DB Error:", dbError);
        return res.status(500).json({ error: 'Database transaction failed.' });
      } finally {
        client.release();
      }
    }

    return res.status(200).json({ status: 'ignored' });

  } catch (err: any) {
    console.error('Webhook processing failed:', err.message);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
};
