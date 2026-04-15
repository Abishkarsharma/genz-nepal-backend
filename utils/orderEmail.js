const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function formatAddress(addr) {
  if (!addr) return 'N/A';
  return [addr.street, addr.area, addr.landmark, addr.city, addr.district, addr.province]
    .filter(Boolean)
    .join(', ');
}

async function sendOrderConfirmation(order, userEmail, userName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${item.image}" width="48" height="48" style="border-radius:4px;object-fit:cover" alt="${item.name}" />
          <span style="font-size:0.88rem;color:#333">${item.name}</span>
        </div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666;font-size:0.85rem">×${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#0ea5e9;font-size:0.88rem">
        NPR ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const addr = order.shippingAddress || {};

  await transporter.sendMail({
    from: `"Gen.Z Nepal" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Order Confirmed #${String(order._id).slice(-8).toUpperCase()} — Gen.Z Nepal`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px">
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:800">Gen.Z Nepal</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:0.9rem">Order Confirmed ✓</p>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#333;font-size:0.95rem;margin:0 0 6px">Hi <strong>${userName}</strong>,</p>
          <p style="color:#666;font-size:0.88rem;margin:0 0 24px;line-height:1.6">Your order has been placed successfully. We'll notify you when it ships.</p>
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Order ID</span>
            <span style="font-family:monospace;font-weight:700;color:#1a1a1a;font-size:1rem">#${String(order._id).slice(-8).toUpperCase()}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px;text-align:left;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Item</th>
                <th style="padding:8px;text-align:center;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Qty</th>
                <th style="padding:8px;text-align:right;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="border-top:2px solid #f0f0f0;padding-top:14px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:0.85rem;color:#888">Subtotal</span>
              <span style="font-size:0.85rem;color:#333">NPR ${order.subtotal?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:0.85rem;color:#888">Shipping</span>
              <span style="font-size:0.85rem;color:#333">NPR ${order.shipping?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:1rem;font-weight:700;color:#1a1a1a">Total</span>
              <span style="font-size:1rem;font-weight:700;color:#0ea5e9">NPR ${order.total?.toLocaleString()}</span>
            </div>
          </div>
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:20px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Delivery Address</p>
            <p style="font-size:0.88rem;font-weight:600;color:#333;margin:0 0 3px">${addr.fullName || ''}</p>
            <p style="font-size:0.82rem;color:#666;margin:0 0 2px">${addr.phone || ''}${addr.email ? ' · ' + addr.email : ''}</p>
            <p style="font-size:0.82rem;color:#666;margin:0">${formatAddress(addr)}</p>
          </div>
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:24px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Payment</p>
            <p style="font-size:0.88rem;color:#333;margin:0;font-weight:500">${order.paymentMethod}
              <span style="background:${order.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7'};color:${order.paymentStatus === 'paid' ? '#059669' : '#d97706'};padding:2px 8px;border-radius:3px;font-size:0.72rem;font-weight:700;margin-left:8px">${order.paymentStatus}</span>
            </p>
          </div>
          <a href="${process.env.FRONTEND_URL}/orders" style="display:block;background:#0ea5e9;color:white;text-align:center;padding:12px;border-radius:4px;text-decoration:none;font-weight:700;font-size:0.9rem">Track My Order →</a>
        </div>
        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #eee">
          <p style="color:#cbd5e1;font-size:0.72rem;margin:0;text-align:center">© ${new Date().getFullYear()} Gen.Z Nepal · Crafted in Kathmandu</p>
        </div>
      </div>
    `,
  });
}

// Send new order alert email to seller
async function sendSellerOrderAlert(order, sellerEmail, sellerName, sellerItems, customerName, customerPhone) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const itemRows = sellerItems.map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${item.image || ''}" width="44" height="44" style="border-radius:4px;object-fit:cover;background:#f5f5f5" alt="${item.name}" />
          <span style="font-size:0.88rem;color:#333;font-weight:500">${item.name}</span>
        </div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666;font-size:0.85rem">×${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#059669;font-size:0.88rem">
        NPR ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const sellerTotal = sellerItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const addr = order.shippingAddress || {};

  await transporter.sendMail({
    from: `"Gen.Z Nepal" <${process.env.EMAIL_USER}>`,
    to: sellerEmail,
    subject: `🛒 New Order #${String(order._id).slice(-8).toUpperCase()} — NPR ${sellerTotal.toLocaleString()}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#059669,#0ea5e9);padding:28px 32px">
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:800">Gen.Z Nepal</h1>
          <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:0.95rem;font-weight:600">🛒 You have a new order!</p>
        </div>

        <div style="padding:28px 32px">
          <p style="color:#333;font-size:0.95rem;margin:0 0 6px">Hi <strong>${sellerName}</strong>,</p>
          <p style="color:#666;font-size:0.88rem;margin:0 0 24px;line-height:1.6">
            A customer just placed an order for your product(s). Please prepare it for delivery.
          </p>

          <!-- Order ID -->
          <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;color:#059669;text-transform:uppercase;letter-spacing:0.05em;font-weight:700">Order ID</span>
            <span style="font-family:monospace;font-weight:800;color:#1a1a1a;font-size:1rem">#${String(order._id).slice(-8).toUpperCase()}</span>
          </div>

          <!-- Items ordered -->
          <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:700">Items Ordered</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px;text-align:left;font-size:0.75rem;color:#888;text-transform:uppercase">Product</th>
                <th style="padding:8px;text-align:center;font-size:0.75rem;color:#888;text-transform:uppercase">Qty</th>
                <th style="padding:8px;text-align:right;font-size:0.75rem;color:#888;text-transform:uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="background:#f0fdf4">
                <td colspan="2" style="padding:10px 8px;font-weight:700;color:#333;font-size:0.9rem">Your Total</td>
                <td style="padding:10px 8px;text-align:right;font-weight:800;color:#059669;font-size:1rem">NPR ${sellerTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Customer info -->
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:16px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:700">Customer Details</p>
            <p style="font-size:0.9rem;font-weight:600;color:#333;margin:0 0 4px">👤 ${customerName}</p>
            <p style="font-size:0.85rem;color:#666;margin:0 0 4px">📞 ${customerPhone || addr.phone || 'N/A'}</p>
            <p style="font-size:0.85rem;color:#666;margin:0">📍 ${formatAddress(addr) || 'N/A'}</p>
          </div>

          <!-- Payment method -->
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:24px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;font-weight:700">Payment Method</p>
            <p style="font-size:0.9rem;color:#333;margin:0;font-weight:600">💳 ${order.paymentMethod}
              <span style="background:${order.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7'};color:${order.paymentStatus === 'paid' ? '#059669' : '#d97706'};padding:2px 8px;border-radius:3px;font-size:0.72rem;font-weight:700;margin-left:8px;text-transform:uppercase">${order.paymentStatus}</span>
            </p>
          </div>

          <a href="${process.env.FRONTEND_URL}/seller" style="display:block;background:#059669;color:white;text-align:center;padding:13px;border-radius:4px;text-decoration:none;font-weight:700;font-size:0.9rem">
            View Order in Seller Dashboard →
          </a>
        </div>

        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #eee">
          <p style="color:#cbd5e1;font-size:0.72rem;margin:0;text-align:center">© ${new Date().getFullYear()} Gen.Z Nepal · Crafted in Kathmandu</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOrderConfirmation, sendSellerOrderAlert };

function formatAddress(addr) {
  if (!addr) return 'N/A';
  return [addr.street, addr.area, addr.landmark, addr.city, addr.district, addr.province]
    .filter(Boolean)
    .join(', ');
}

async function sendOrderConfirmation(order, userEmail, userName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return; // skip if not configured

  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${item.image}" width="48" height="48" style="border-radius:4px;object-fit:cover" alt="${item.name}" />
          <span style="font-size:0.88rem;color:#333">${item.name}</span>
        </div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666;font-size:0.85rem">×${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#0ea5e9;font-size:0.88rem">
        NPR ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const addr = order.shippingAddress || {};

  await transporter.sendMail({
    from: `"Gen.Z Nepal" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Order Confirmed #${String(order._id).slice(-8).toUpperCase()} — Gen.Z Nepal`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px">
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:800">Gen.Z Nepal</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:0.9rem">Order Confirmed ✓</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px">
          <p style="color:#333;font-size:0.95rem;margin:0 0 6px">Hi <strong>${userName}</strong>,</p>
          <p style="color:#666;font-size:0.88rem;margin:0 0 24px;line-height:1.6">
            Your order has been placed successfully. We'll notify you when it ships.
          </p>

          <!-- Order ID -->
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Order ID</span>
            <span style="font-family:monospace;font-weight:700;color:#1a1a1a;font-size:1rem">#${String(order._id).slice(-8).toUpperCase()}</span>
          </div>

          <!-- Items -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:8px;text-align:left;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Item</th>
                <th style="padding:8px;text-align:center;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Qty</th>
                <th style="padding:8px;text-align:right;font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <div style="border-top:2px solid #f0f0f0;padding-top:14px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:0.85rem;color:#888">Subtotal</span>
              <span style="font-size:0.85rem;color:#333">NPR ${order.subtotal?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <span style="font-size:0.85rem;color:#888">Shipping</span>
              <span style="font-size:0.85rem;color:#333">NPR ${order.shipping?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:1rem;font-weight:700;color:#1a1a1a">Total</span>
              <span style="font-size:1rem;font-weight:700;color:#0ea5e9">NPR ${order.total?.toLocaleString()}</span>
            </div>
          </div>

          <!-- Delivery address -->
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:20px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px">Delivery Address</p>
            <p style="font-size:0.88rem;font-weight:600;color:#333;margin:0 0 3px">${addr.fullName || ''}</p>
            <p style="font-size:0.82rem;color:#666;margin:0 0 2px">${addr.phone || ''}${addr.email ? ' · ' + addr.email : ''}</p>
            <p style="font-size:0.82rem;color:#666;margin:0">${formatAddress(addr)}</p>
          </div>

          <!-- Payment -->
          <div style="background:#f8fafc;border-radius:6px;padding:14px 18px;margin-bottom:24px">
            <p style="font-size:0.75rem;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px">Payment</p>
            <p style="font-size:0.88rem;color:#333;margin:0;font-weight:500">${order.paymentMethod}
              <span style="background:${order.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7'};color:${order.paymentStatus === 'paid' ? '#059669' : '#d97706'};padding:2px 8px;border-radius:3px;font-size:0.72rem;font-weight:700;margin-left:8px">${order.paymentStatus}</span>
            </p>
          </div>

          <a href="${process.env.FRONTEND_URL}/orders" style="display:block;background:#0ea5e9;color:white;text-align:center;padding:12px;border-radius:4px;text-decoration:none;font-weight:700;font-size:0.9rem">
            Track My Order →
          </a>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #eee">
          <p style="color:#cbd5e1;font-size:0.72rem;margin:0;text-align:center">
            © ${new Date().getFullYear()} Gen.Z Nepal · Crafted in Kathmandu
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendOrderConfirmation };
