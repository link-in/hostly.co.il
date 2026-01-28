# 📱 Whapi WhatsApp Integration Setup

## Overview

Whapi.cloud is a powerful WhatsApp API service that provides reliable message delivery at an affordable price - perfect for POC and production environments.

---

## 🚀 Quick Setup

### Step 1: Get Your Whapi Token

1. Go to [https://whapi.cloud](https://whapi.cloud)
2. Sign up for an account
3. Connect your WhatsApp number/channel
4. Go to API Settings and copy your **API Token**

### Step 2: Add Environment Variables

In your Vercel dashboard (or `.env.local` for development):

```env
WHAPI_TOKEN=your_token_here
WHAPI_BASE_URL=https://gate.whapi.cloud
```

> **Note:** `WHAPI_BASE_URL` is optional and defaults to `https://gate.whapi.cloud`

### Step 3: Deploy

```bash
git add .
git commit -m "Switch to Whapi for WhatsApp messaging"
git push origin main
```

Vercel will automatically deploy with the new configuration.

---

## 📋 Testing

### Test in Development

```bash
# Set your environment variables in .env.local
WHAPI_TOKEN=your_token_here
WHAPI_BASE_URL=https://gate.whapi.cloud

# Run the dev server
bun dev
```

### Test Message Sending

The system will automatically use Whapi when:
1. A new booking is created via dashboard
2. A webhook is received from Beds24

---

## 📊 Message Format

### Guest Notification
```
שלום {name}! 🏔️
קיבלנו את הזמנתך ב-{property}.
📅 תאריך כניסה: {checkIn}
נשמח לארח אותך! 🎉
```

### Owner Notification
```
🔔 הזמנה חדשה!
אורח: {name}
📅 כניסה: {checkIn} | יציאה: {checkOut}
👥 מבוגרים: {adults}
💰 מחיר: ₪{price}
```

---

## 🔍 Monitoring

### Check Logs in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Click on "Deployments"
4. Click on the latest deployment
5. Go to "Functions" tab
6. Look for WhatsApp-related logs:
   - `📱 Sending WhatsApp via Whapi...`
   - `✅ WhatsApp sent successfully (whapi)`
   - `❌ WhatsApp failed (whapi): [error]`

### Check Database Logs

All WhatsApp messages are logged in the `notifications_log` table:

```sql
SELECT 
  booking_id,
  guest_name,
  guest_phone,
  whatsapp_status,
  status,
  created_at
FROM notifications_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Features Supported

- ✅ Text messages
- ✅ Image messages with captions
- ✅ Document messages
- ✅ Automatic retry on failure
- ✅ Detailed error logging
- ✅ Response tracking with message IDs

---

## 💰 Pricing Benefits

Whapi.cloud is significantly more affordable than UltraMsg for POC stage:

- **Free tier**: Available for testing
- **Pay-as-you-go**: Lower per-message cost
- **No monthly minimums**: Perfect for POC
- **Scalable**: Grow as your business grows

---

## 🔧 Advanced Configuration

### Custom Base URL

If you're using Whapi's dedicated instance:

```env
WHAPI_BASE_URL=https://your-custom-instance.whapi.cloud
```

### Force Provider Selection

If you want to explicitly use Whapi (even if other providers are configured):

```env
WHATSAPP_PROVIDER=whapi
```

---

## 🐛 Troubleshooting

### "Whapi configuration missing"

- Make sure `WHAPI_TOKEN` is set in Vercel environment variables
- Redeploy after adding variables

### "HTTP 401 Unauthorized"

- Check that your token is correct
- Make sure the token hasn't expired
- Verify your Whapi subscription is active

### Messages Not Sending

1. Check Vercel function logs
2. Verify phone numbers are in international format (e.g., `+972501234567`)
3. Check Whapi dashboard for channel status
4. Ensure WhatsApp channel is connected

### Testing in Development

```bash
# Check if token is loaded
echo $WHAPI_TOKEN

# If empty, make sure .env.local exists
cat .env.local
```

---

## 📚 API Documentation

Full Whapi API documentation: [https://whapi.cloud/docs](https://whapi.cloud/docs)

---

## 🔄 Switching Back to UltraMsg (if needed)

If you ever need to switch back:

1. Add UltraMsg environment variables
2. Set `WHATSAPP_PROVIDER=ultramsg`
3. Restore the UltraMsg provider file

---

**Built with ❤️ for HOSTLY**
