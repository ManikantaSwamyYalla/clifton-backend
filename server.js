import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
  
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const INBOUND_HASH_KEY = process.env.PLUGNPAY_HASH_KEY;
const GATEWAY_ACCOUNT = process.env.PLUGNPAY_GATEWAY_ACCOUNT;

app.post('/api/payment/smartscreen/initiate', (req, res) => {
    try {
        const { orderId, amount, customerName, email, phone, address, city, state, zip, country, successUrl, cancelUrl } = req.body;

        // 1. Calculate timestamp in GMT (YYYYMMDDhhmmss)
        const transacttime = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

        // 2. Generate the SHA-256 hash for security validation
        const formattedAmount = Number(amount).toFixed(2);
        const authhash_string = INBOUND_HASH_KEY + formattedAmount + (orderId || '') + GATEWAY_ACCOUNT + transacttime;
        const authhash = crypto.createHash('sha256').update(authhash_string).digest('hex');

        // 3. Generate the HTML auto-submit form
        const htmlForm = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Processing Payment...</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
                    .loader { border: 4px solid #d1d5db; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body onload="document.getElementById('plugnpayForm').submit()">
                <div class="loader"></div>
                <h2>Connecting to Secure Gateway...</h2>
                <p>Please wait while we redirect you to Plug N Pay.</p>

                <form id="plugnpayForm" method="POST" action="https://pay1.plugnpay.com/pay/" style="display: none;">
                    <input type="hidden" name="pt_gateway_account" value="${GATEWAY_ACCOUNT}">
                    <input type="hidden" name="pt_transaction_amount" value="${Number(amount).toFixed(2)}">
                    <input type="hidden" name="pt_order_id" value="${orderId || ''}">
                    <input type="hidden" name="pt_billing_name" value="${customerName || ''}">
                    <input type="hidden" name="pt_customer_email" value="${email || ''}">
                    <input type="hidden" name="pt_customer_phone" value="${phone || ''}">
                    <input type="hidden" name="pt_billing_address" value="${address || ''}">
                    <input type="hidden" name="pt_billing_city" value="${city || ''}">
                    <input type="hidden" name="pt_billing_state" value="${state || ''}">
                    <input type="hidden" name="pt_billing_postal_code" value="${zip || ''}">
                    <input type="hidden" name="pt_billing_country" value="${country === 'Bahamas' ? 'BS' : 'US'}">
                    
                    <input type="hidden" name="pb_success_url" value="${successUrl || ''}">
                    <input type="hidden" name="pb_failure_url" value="${cancelUrl || ''}">
                    <input type="hidden" name="pb_transition_type" value="get">
                    <input type="hidden" name="pt_currency" value="usd">

                    <input type="hidden" name="pt_transaction_hash" value="${authhash}">
                    <input type="hidden" name="pt_transaction_time" value="${transacttime}">
                </form>
            </body>
            </html>
        `;

        // 4. Return success to the frontend with the HTML string
        res.json({
            Success: true,
            HtmlAutoSubmitForm: htmlForm
        });

    } catch (error) {
        console.error("Payment Initiation Error:", error);
        res.status(500).json({ Success: false, message: "Failed to initiate payment" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
