import 'dotenv/config'; // Crucial for loading DATABASE_URL locally
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { razorpayWebhookIngest, getInvoices } from './controllers/webhook.controller';

const app = express();

app.use(helmet());

// Restrict CORS heavily in production environment
// Allow Next.js local server to communicate safely
app.use(cors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT']
}));

// Serve raw simulation PDFs
app.use('/downloads/invoices', express.static(path.join(__dirname, '../../tmp/invoices')));

app.use(express.json());

// Public-Facing Webhook Routes
app.post('/api/webhooks/razorpay', razorpayWebhookIngest);

// Internal Dashboard Routes (Should be protected by JWTMiddleware in Prod)
app.get('/api/invoices', getInvoices);

// Healthcheck for AWS Load Balancer Target Groups
app.get('/health', (req, res) => res.status(200).send('OK'));

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`[SECUREBILL RUNTIME] API shielding actively on port ${port} | SIMULATION: ${process.env.SIMULATION_MODE || false}`);
});

export default app;
