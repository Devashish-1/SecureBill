terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1" # Mumbai region for India compliance
}

# -----------------------------------------------------------------------------
# VPC Core Infrastructure
# -----------------------------------------------------------------------------
resource "aws_vpc" "securebill_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "SecureBill-VPC"
  }
}

resource "aws_subnet" "private_db_subnet_1" {
  vpc_id            = aws_vpc.securebill_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-south-1a"
}

resource "aws_subnet" "private_db_subnet_2" {
  vpc_id            = aws_vpc.securebill_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "ap-south-1b"
}

resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "securebill-db-subnet-group"
  subnet_ids = [aws_subnet.private_db_subnet_1.id, aws_subnet.private_db_subnet_2.id]
}

# -----------------------------------------------------------------------------
# KMS Encryption Keys (AES-256 at Rest)
# -----------------------------------------------------------------------------
resource "aws_kms_key" "rds_kms_key" {
  description             = "KMS Key for SecureBill PostgreSQL RDS Encryption"
  enable_key_rotation     = true # Important for compliance
  deletion_window_in_days = 30
}

resource "aws_kms_key" "s3_kms_key" {
  description             = "KMS Key for SecureBill S3 Invoice PDF Encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

# -----------------------------------------------------------------------------
# Relational Database Service (RDS - PostgreSQL)
# -----------------------------------------------------------------------------
resource "aws_db_instance" "securebill_db" {
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15.3"
  instance_class         = "db.t4g.micro"
  identifier             = "securebill-prod-db"
  username               = "dbadmin"
  password               = "dummy-secure-password" # Use AWS Secrets Manager in real-world
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.rds_kms_key.arn
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  publicly_accessible    = false
  skip_final_snapshot    = false
  deletion_protection    = true
}

# -----------------------------------------------------------------------------
# Secure S3 Bucket for Invoices (With Lifecycle for Glacier)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "invoice_bucket" {
  bucket = "securebill-invoices-prod"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "invoice_encryption" {
  bucket = aws_s3_bucket.invoice_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_kms_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "block_public_access" {
  bucket                  = aws_s3_bucket.invoice_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "invoice_lifecycle" {
  bucket = aws_s3_bucket.invoice_bucket.id

  rule {
    id     = "archive-to-glacier"
    status = "Enabled"
    
    # Transition invoices older than 365 days to S3 Glacier Deep Archive to cut costs
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# -----------------------------------------------------------------------------
# CloudTrail Auditing (Immutable Logs)
# -----------------------------------------------------------------------------
resource "aws_s3_bucket" "cloudtrail_bucket" {
  bucket = "securebill-cloudtrail-logs"
  # Object lock is required so logs cannot be deleted or altered
  object_lock_enabled = true
}

resource "aws_cloudtrail" "main_trail" {
  name                          = "securebill-master-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_bucket.id
  include_global_service_events = true
  enable_log_file_validation    = true # Ensures log files are cryptographically verified
  kms_key_id                    = aws_kms_key.s3_kms_key.arn
}

# -----------------------------------------------------------------------------
# WAF & API Gateway (Edge Security)
# -----------------------------------------------------------------------------
resource "aws_wafv2_web_acl" "api_waf" {
  name        = "securebill-api-waf"
  description = "WAF for blocking malicious requests & rate limiting"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000 # Max requests per 5 minutes per IP
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "SQLiProtection"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiProtectionMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WAFGeneralMetric"
    sampled_requests_enabled   = true
  }
}

# Boilerplate API Gateway REST API (To be attached to Lambda or ECS backend)
resource "aws_api_gateway_rest_api" "secure_api" {
  name = "SecureBill-API"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}
