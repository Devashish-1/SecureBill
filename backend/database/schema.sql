-- --------------------------------------------------------------------------------
-- SecureBill Database Schema (PostgreSQL via AWS RDS)
-- --------------------------------------------------------------------------------
-- ARCHITECTURE NOTE:
-- This database runs on an RDS instance configured with transparent data 
-- encryption (TDE) via AWS KMS (AES-256). All data at rest is encrypted.
-- Further application-level encryption can be used for highly sensitive PII 
-- using the AWS Crypto SDK.
-- --------------------------------------------------------------------------------

-- Merchants Table
-- Stores the businesses using SecureBill.
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    -- KMS Encryption note: Email and Phone should strongly be considered for 
    -- application-level encryption as well if multi-tenant data leakage is a risk.
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- GSTIN is sensitive Business PII in India.
    gstin VARCHAR(15) UNIQUE NOT NULL,
    
    razorpay_account_id VARCHAR(100), -- For mapping incoming webhooks
    stripe_account_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
-- Stores the end-users who made payments.
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Billing address details needed for IGST/CGST/SGST determination
    billing_state VARCHAR(50) NOT NULL,
    billing_city VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_merchant_customer UNIQUE(merchant_id, email)
);

-- Invoices Table
-- The core financial ledger for generated bills.
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- E-Invoicing Fields (India Compliance)
    irn VARCHAR(64) UNIQUE, -- Invoice Reference Number from NIC
    qr_code_url VARCHAR(2048),
    
    -- Payment & amounts
    payment_provider VARCHAR(50) NOT NULL, -- e.g., 'razorpay', 'stripe'
    payment_id VARCHAR(100) UNIQUE NOT NULL, -- The Razorpay/Stripe txn ID
    amount_subtotal NUMERIC(10, 2) NOT NULL,
    
    -- Tax breakdown based on intra-state vs inter-state
    tax_cgst NUMERIC(10, 2) DEFAULT 0.00,
    tax_sgst NUMERIC(10, 2) DEFAULT 0.00,
    tax_igst NUMERIC(10, 2) DEFAULT 0.00,
    amount_total NUMERIC(10, 2) NOT NULL,
    
    currency VARCHAR(3) DEFAULT 'INR',
    hsn_sac_code VARCHAR(20), -- Harmonized System of Nomenclature
    
    -- S3 Storage Reference
    s3_document_key VARCHAR(1024), -- Location of the generated PDF
    status VARCHAR(20) DEFAULT 'GENERATED', -- 'PENDING', 'GENERATED', 'FAILED'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_total_amount CHECK (amount_total = (amount_subtotal + tax_cgst + tax_sgst + tax_igst))
);

-- Indexes for frequent queries (Optimized for webhook lookups and dashboard speed)
CREATE INDEX idx_merchants_razorpay ON merchants(razorpay_account_id);
CREATE INDEX idx_invoices_payment_id ON invoices(payment_id);
CREATE INDEX idx_invoices_merchant ON invoices(merchant_id);
