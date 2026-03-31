import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';

const isSimulated = process.env.SIMULATION_MODE === 'true';

let s3: AWS.S3 | null = null;
if (!isSimulated) {
    s3 = new AWS.S3({ region: process.env.AWS_REGION || 'ap-south-1' });
}

const BUCKET_NAME = process.env.INVOICE_BUCKET_NAME || 'securebill-invoices-prod';

export const uploadInvoicePDF = async (pdfBuffer: Buffer, s3Key: string): Promise<void> => {
    if (isSimulated) {
        // In simulation mode, write buffer to a local tmp directory to mimic storage
        const localPath = path.join(__dirname, '../../tmp', s3Key);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, pdfBuffer);
        console.log(`[SIMULATION] Uploaded encrypted mock PDF to local fs: ${localPath}`);
        return;
    }

    if (!s3) throw new Error("S3 Client not initialized.");

    const params: AWS.S3.PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'aws:kms'
    };

    await s3.putObject(params).promise();
    console.log(`Successfully uploaded encrypted invoice to S3: ${s3Key}`);
};

export const generatePresignedUrl = async (s3Key: string): Promise<string> => {
    if (isSimulated) {
        // Return a mock local URL for viewing mock files
        console.log(`[SIMULATION] Generated 15-minute presigned URL for local doc: ${s3Key}`);
        return `http://localhost:8080/downloads/${s3Key}`;
    }

    if (!s3) throw new Error("S3 Client not initialized.");

    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Expires: 900 // 15 minutes (900 seconds)
    };

    try {
        const url = await s3.getSignedUrlPromise('getObject', params);
        console.log(`Generated 15-minute presigned URL for document: ${s3Key}`);
        return url;
    } catch (err) {
        console.error('Error generating pre-signed URL:', err);
        throw new Error('Could not access secure storage.');
    }
};
