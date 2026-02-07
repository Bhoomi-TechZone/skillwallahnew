import hmac
import hashlib
import razorpay

RAZORPAY_KEY_ID = "rzp_test_R7vr1NPWxZnHX7"
RAZORPAY_KEY_SECRET = "R8O0b4amJRxjWsK9HyZvMowZ"
WEBHOOK_SECRET = "myRazorSecret4567"
def razorpay_client():

    if not razorpay:
        raise RuntimeError("razorpay package not installed")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

async def create_razorpay_order(amount: float, currency: str, receipt: str) -> dict:
    client = razorpay_client()
    # Razorpay takes amount in paise
    order = client.order.create({
        "amount": int(amount * 100),
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1
    })
    return order

def verify_razorpay_signature(payload: bytes, signature: str, secret: str) -> bool:
    # Razorpay webhooks: X-Razorpay-Signature over raw body with webhook secret (NOT key secret)
    # If you’re using the "key secret" here, set that as the webhook secret in dashboard.
    digest = hmac.new(
        bytes(secret, "utf-8"),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(digest, signature)

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_ADDRESS = "arzumehreen050@gmail.com"
EMAIL_PASSWORD = "cpus ctsa fdtm dmqs"

def send_email_receipt(to_email: str, subject: str, html_body: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())

        print(f"✅ Receipt email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

from datetime import datetime

def render_receipt_html(name: str, amount: float, currency: str, campaign_title: str, receipt_no: str) -> str:
    """Generate donation receipt HTML."""
    today = datetime.utcnow().strftime("%d %B %Y, %H:%M UTC")

    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border:1px solid #ddd; border-radius:8px; padding:20px;">
            <h2 style="text-align:center; color:#2c3e50;">Donation Receipt</h2>
            <p>Dear <b>{name}</b>,</p>
            <p>Thank you for your generous contribution to <b>{campaign_title}</b>. Your support helps us continue our mission at <b>Vision Help</b>.</p>
            
            <table style="width:100%; border-collapse:collapse; margin:20px 0;">
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;"><b>Receipt No</b></td>
                    <td style="padding:8px; border:1px solid #ddd;">{receipt_no}</td>
                </tr>
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;"><b>Donor Name</b></td>
                    <td style="padding:8px; border:1px solid #ddd;">{name}</td>
                </tr>
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;"><b>Campaign</b></td>
                    <td style="padding:8px; border:1px solid #ddd;">{campaign_title}</td>
                </tr>
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;"><b>Amount</b></td>
                    <td style="padding:8px; border:1px solid #ddd;">{currency.upper()} {amount:.2f}</td>
                </tr>
                <tr>
                    <td style="padding:8px; border:1px solid #ddd;"><b>Date</b></td>
                    <td style="padding:8px; border:1px solid #ddd;">{today}</td>
                </tr>
            </table>
            
            <p style="margin-top:20px;">This receipt acknowledges your donation. Please keep it for your records.</p>
            <p style="color:#555;">With gratitude,<br><b>Vision Help Foundation</b></p>
        </div>
    </body>
    </html>
    """