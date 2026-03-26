require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const db = require('./databasepq.js');
const jwt = require('jsonwebtoken');
const puppeteer = require('puppeteer');


const sseClients = new Set();

const app = express();

app.set('trust proxy', 1);

const port = process.env.PORT || 3000;

// --- Stats sequencing (monotonic) ---
let statsSeq = 0;

//STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads/music', express.static(path.join(__dirname, 'public/uploads/music')));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'public/uploads/profiles')));

// ======================
// Robust counts + SSE
// ======================
async function getCounts() {
  try {
    // archived = true => archived
    // published => archived = false OR archived IS NULL (defensive)
    const q = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS users,
        (SELECT COUNT(*) FROM content WHERE archived IS TRUE)::int AS archived,
        (SELECT COUNT(*) FROM content WHERE archived IS FALSE OR archived IS NULL)::int AS published
    `);

    const row = q.rows[0] || { users: 0, archived: 0, published: 0 };
    const users = Number.parseInt(row.users || 0, 10) || 0;
    const archived = Number.parseInt(row.archived || 0, 10) || 0;
    const published = Number.parseInt(row.published || 0, 10) || 0;

    return {
      users,
      published,
      archived,
      totalArticles: published + archived
    };
  } catch (err) {
    console.error('getCounts error:', err);
    return { users: 0, published: 0, archived: 0, totalArticles: 0 };
  }
}

// Return counts + current seq and ts (does NOT increment)
async function getCountsWithMeta() {
  const counts = await getCounts();
  return Object.assign({}, counts, { seq: statsSeq, ts: Date.now() });
}

async function notifyStatsChange() {
  try {
    // increment monotonic sequence
    statsSeq = (statsSeq || 0) + 1;
    const payloadBase = await getCounts();
    const payload = Object.assign({}, payloadBase, { seq: statsSeq, ts: Date.now() });
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    console.debug('[notifyStatsChange] broadcasting payload →', payload);

    for (const res of Array.from(sseClients)) {
      try {
        res.write(data);
      } catch (err) {
        try { res.end(); } catch (e) { /* ignore */ }
        sseClients.delete(res);
      }
    }
  } catch (err) {
    console.error('notifyStatsChange error:', err);
  }
}

// ======================================
// 2. MULTER FILE UPLOAD & STORAGE CONFIG
// ======================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads/profiles';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created folder: ${dir}`);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    console.log(`📸 Uploading profile picture: ${uniqueName}`);
    cb(null, uniqueName);
  }
});
const uploadProfilePic = multer({ storage: profilePicStorage });

// ======================================
// 3. EMAIL TRANSPORTER (Nodemailer)
// ======================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ======================================
// 4. MIDDLEWARE
// ======================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'feelbright_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000  // Change from 24 hours to 15 minutes
  },
  rolling: true  // Add this - resets maxAge on each request
}));

const requireAdmin = (req, res, next) => {
  if (req.session.admin) return next();

  const wantsJSON =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJSON) {
    return res.status(401).json({ success: false, error: 'Admin access required' });
  }

  res.redirect('/admin/adminlogin.html');
};

// Prevent caching of resource lists (admin uses these)
app.use('/resources', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Helpers
const jsonParseSafe = (str, fallback = null) => {
  try { return JSON.parse(str); } catch { return fallback; }
};
const requireLogin = (req, res, next) => {
  if (req.session.user) return next();

  const wantsJSON =
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));

  if (wantsJSON) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  res.redirect('/login');
};

// Lightweight server-side dedupe: same type+title created very recently (seconds window) => assume duplicate submit
async function findRecentDuplicate(type, title, seconds = 10) {
  if (!title) return null;
  // Using interval construction with parameter: pass seconds as string/number works with this expression
  const q = await db.query(
    `SELECT id FROM content WHERE type = $1 AND title = $2 AND created_at > (NOW() - ($3 || ' seconds')::interval) LIMIT 1`,
    [type, title, String(seconds)]
  );
  return q.rows[0] ? q.rows[0].id : null;
}

// ======================================
// 5. AUTHENTICATION ROUTES
// ======================================
// Signup
app.post('/signup', async (req, res) => {
  const { first_name, middle_name, last_name, email, password, confirm_password } = req.body;

  if (!first_name || !last_name || !email || !password || !confirm_password) {
    return res.status(400).json({ success: false, error: 'All required fields must be filled' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ success: false, error: 'Passwords do not match' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  try {
    // Check if email exists
    const exists = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));

    // Insert new user with is_verified = false
    const result = await db.query(
      `INSERT INTO users (first_name, middle_name, last_name, email, password, is_verified, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, created_at, is_verified`,
      [first_name, middle_name || null, last_name, email.trim().toLowerCase(), hashed, false, false]
    );

    const newUser = result.rows[0];

    // Generate email verification token
    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verifyLink = `${process.env.BASE_URL}/verify?token=${token}`;

    // Send verification email (DESIGN ONLY)
    const info = await transporter.sendMail({
      from: `"FeelBright" <${process.env.EMAIL_USER}>`,
      to: newUser.email,
      subject: 'Verify your email',
      html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6f5;">
    <center style="width:100%;background: #ffffff;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">
              <!-- BRAND BAR -->
              <tr>
                <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);border-radius:14px 14px 0 0;padding:20px 24px;text-align:center;">
                  <span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:22px;line-height:26px;color:#ffffff;">FeelBright</span>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#dcfce7;margin-top:4px;">Email Verification</div>
                </td>
              </tr>

              <!-- CARD -->
              <tr>
                <td style="background: #ffffff; border:1px solid #e6ebea;border-top:none;border-radius:0 0 14px 14px;padding:0;">
                  <!-- success banner -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="padding:16px 20px 0 20px;">
                        <h1 style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:26px;color:#0f172a;">
                          Welcome to FeelBright, ${newUser.first_name}!
                        </h1>
                        <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#334155;">
                          Please verify your email to activate your account and get full access.
                        </p>
                      </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                      <td align="center" style="padding:8px 20px 4px 20px;">
                        <a href="${verifyLink}"
                           style="background: #10B981;color:#ffffff;text-decoration:none;display:inline-block;font-family:Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;line-height:18px;padding:12px 18px;border-radius:8px;">
                           Verify Email
                        </a>
                      </td>
                    </tr>

                    <!-- Whats next -->
                    <tr>
                      <td style="padding:18px 20px 4px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e6ebea;border-radius:10px;">
                          <tr>
                            <td style="padding:14px 16px;">
                              <div style="font-family:Arial,Helvetica,sans-serif;font-weight:700;color:#0f172a;font-size:13px;margin:0 0 8px 0;">What’s next</div>
                              <ul style="margin:0;padding:0 0 0 18px;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:13px;line-height:20px;">
                                <li>Click the button above to confirm your email.</li>
                                <li>Log in using your existing credentials.</li>
                                <li>Start exploring resources, assessments, and features.</li>
                              </ul>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Help -->
                    <tr>
                      <td style="padding:14px 20px 20px 20px;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b;">
                          Didn’t create this account? You can safely ignore this message.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:14px 12px 0 12px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#94a3b8;">
                    This is an automated notification. © ${new Date().getFullYear()} FeelBright
                  </div>
                </td>
              </tr>
              <tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </center>
  </body>
</html>
      `,
    });
    console.log('Verification email sent:', info.messageId);

    res.status(201).json({
      success: true,
      message: '✅ Registration successful! Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Registration error details:', err.message, err.stack);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



app.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [decoded.id]);

    // redirect to frontend with a flag
    res.redirect(`${process.env.BASE_URL}/?verified=success`);
  } catch (err) {
    console.error('Verification error:', err);
    res.redirect(`${process.env.BASE_URL}/?verified=fail`);
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    // Check if user is archived
    if (user.is_archived === true) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support for assistance.',
        code: 'ACCOUNT_ARCHIVED'
      });
    }

    // Check if email is verified
    if (user.is_verified !== true) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    req.session.user = {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      profile_picture: user.profile_picture || null,
    };

    res.json({ success: true, message: 'Login successful', user: req.session.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
  // In your logout function, add:
});


// Session Check with latest profile picture from DB
app.get('/auth/user', async (req, res) => {
  if (!req.session.user) {
    return res.json({ loggedIn: false });
  }

  try {
    const result = await db.query(
      `SELECT first_name, middle_name, last_name, email, birthday, profile_picture FROM users WHERE id = $1`,
      [req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ loggedIn: false });
    }

    res.json({
      loggedIn: true,
      ...result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ loggedIn: false, error: 'Server error' });
  }
});

// ======================================
// 6. PASSWORD RESET FLOW
// ======================================

// Fixed server-side forgot password handler
app.post('/forgot', async (req, res) => {
  console.log("🔐 Forgot request body:", req.body);

  const { email } = req.body;
  console.log("🔐 Forgot request email (raw):", email, "| type:", typeof email);

  // Validate email exists
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }

  // Normalize input
  const cleanEmail = email.trim().toLowerCase();
  console.log("🔐 Normalized email:", cleanEmail);

  try {
    // Use LOWER() in the query to ensure case-insensitive matching
    const userCheck = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()] // Don't lowercase here, let the SQL function handle it
    );

    console.log("🔍 Query result rows:", userCheck.rows.length);

    // Always return success to prevent email enumeration attacks
    if (userCheck.rowCount === 0) {
      console.log("📧 No user found for email:", cleanEmail);
      // Still return success for security
      return res.json({
        success: true,
        message: 'If that email exists in our system, we sent a reset link.'
      });
    }

    const user = userCheck.rows[0];
    console.log("👤 User found:", user.email);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update the user with reset token
    await db.query(
      'UPDATE users SET password_reset_token=$1, token_expiry=$2 WHERE id=$3',
      [token, expires, user.id]
    );

    const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/new-pass.html?token=${token}`;

    // Send email
    const info = await transporter.sendMail({
      from: `"FeelBright" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - FeelBright',
      text: `Reset your password: ${resetLink}\n\nThis link will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto;">
          <div style="background: #7FC58B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">FeelBright</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${user.first_name},</h2>
            
            <p>We received a request to reset your password for your FeelBright account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #7FC58B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>This link will expire in 15 minutes.</strong>
            </p>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #666; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #7FC58B; word-break: break-all;">${resetLink}</a>
            </p>
          </div>
        </div>
      `
    });

    console.log("✅ Reset email sent:", info.messageId, "to:", user.email);

    res.json({
      success: true,
      message: 'If that email exists in our system, we sent a reset link to your email.'
    });

  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again later.'
    });
  }
});
// Perform Reset
app.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
  }

  try {
    const userQ = await db.query(
      'SELECT * FROM users WHERE password_reset_token=$1 AND token_expiry>NOW()',
      [token]
    );

    if (userQ.rowCount === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token.' });
    }

    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));

    await db.query(
      'UPDATE users SET password=$1, password_reset_token=NULL, token_expiry=NULL WHERE id=$2',
      [hashed, userQ.rows[0].id]
    );

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ success: false, error: 'Error resetting password.' });
  }
});

// ======================================
// 7. QUOTE (Create/Read/Delete)
// ======================================

app.post('/admin/quote', upload.single('thumbnail'), async (req, res) => {
  try {
    const { quote, quoteTitle, authorName, famousFor, country, id } = req.body;

    if (!quote || !quoteTitle || !authorName || !famousFor) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const thumbPath = req.file ? `/uploads/${req.file.filename}` : null;

    if (id && /^\d+$/.test(String(id))) {
      const result = await db.query(
        `UPDATE content
            SET title       = $1,
                body        = $2,
                author_name = $3,
                famous_for  = $4,
                country     = $5,
                archived    = false,
                thumbnail   = COALESCE($6, thumbnail),
                updated_at  = NOW()
          WHERE id = $7 AND type = 'quote'
          RETURNING id`,
        [quoteTitle, quote, authorName, famousFor, country || null, thumbPath, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Quote not found' });
      }

      return res.json({ success: true, message: 'Quote updated successfully!', quoteId: id });
    }

    // Dedupe: check recent identical title for 'quote'
    const dupQuoteId = await findRecentDuplicate('quote', quoteTitle, 10);
    if (dupQuoteId) {
      console.warn(`[dedupe:quote] duplicate detected for title="${quoteTitle}" -> returning existing id=${dupQuoteId}`);
      return res.json({ success: true, message: 'Duplicate prevented - returning existing quote', quoteId: dupQuoteId, deduped: true });
    }

    const result = await db.query(
      `INSERT INTO content
         (title, body, author_name, famous_for, country, thumbnail, category, type, created_at, updated_at, archived)
       VALUES
         ($1,   $2,   $3,          $4,         $5,      $6,        $7,       'quote', NOW(),     NOW(),     false)
       RETURNING id`,
      [quoteTitle, quote, authorName, famousFor, country || null, thumbPath, 'Quote']
    );

    res.json({ success: true, message: 'Quote created successfully!', quoteId: result.rows[0].id });
  } catch (err) {
    console.error('Error saving quote:', {
      code: err.code, message: err.message, detail: err.detail, where: err.where, stack: err.stack
    });
    res.status(500).json({ success: false, error: 'Failed to save quote' });
  }
});


app.post('/admin/quote/draft/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE content SET archived = true, updated_at = NOW()
       WHERE id = $1 AND type = 'quote' RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found or type mismatch' });
    }

    // Successfully saved as draft (no stats updated)
    res.json({ success: true, message: 'Quote saved as draft' });
  } catch (err) {
    console.error('Error saving draft (quote):', err);
    res.status(500).json({ success: false, error: 'Failed to save draft.' });
  }
});


app.put('/admin/quote/publish/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE content SET archived = false, updated_at = NOW()
       WHERE id = $1 AND type = 'quote' RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found or type mismatch' });
    }

    // Successfully published (no stats updated)
    res.json({ success: true, message: 'Quote published successfully' });
  } catch (err) {
    console.error('Error publishing quote:', err);
    res.status(500).json({ success: false, error: 'Failed to publish quote.' });
  }
});


app.delete('/admin/quote/:id', async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Check whether the quote exists and its archived state
    const meta = await client.query(
      `SELECT archived FROM content WHERE id=$1 AND type='quote'`,
      [id]
    );
    if (meta.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }

    // Delete the quote
    await client.query(`DELETE FROM content WHERE id=$1 AND type='quote'`, [id]);

    await client.query('COMMIT');

    // Return success (no stats sync)
    return res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting quote:', err);
    res.status(500).json({ success: false, error: 'Server error deleting quote.' });
  } finally {
    client.release();
  }
});


app.get('/resources/quotes', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id,
              title        AS "quoteTitle",
              body         AS "quoteText",
              author_name  AS "author",
              famous_for   AS "famousFor",
              country,
              thumbnail,
              archived,
              created_at   AS "createdAt",
              updated_at   AS "updatedAt"
         FROM content
        WHERE type = 'quote' AND (archived IS NULL OR archived = false)
     ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quotes:', err);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});


app.get('/resources/quote/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id,
              title        AS "quoteTitle",
              body         AS "quote",
              author_name  AS "author",
              famous_for   AS "famousFor",
              country,
              thumbnail,
              archived,
              created_at   AS "createdAt",
              updated_at   AS "updatedAt"
         FROM content
        WHERE id = $1 AND type = 'quote'`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quote:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// ======================================
// 8. CONTACT & MESSAGING ROUTES
// ======================================
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await db.query('INSERT INTO contact_messages(name,email,message) VALUES($1,$2,$3)', [name, email, message]);
    await transporter.sendMail({
      from: `"FeelBright" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Thanks for reaching out, ${name}`,
      text: `Hi ${name},\n\nWe received your message: "${message}"\n\n– Psych Department`
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/contact:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM contact_messages ORDER BY submitted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM contact_messages WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ======================================
// 9. ARTICLE & CONTENT MANAGEMENT
// ======================================
app.post(
  '/admin/article',
  requireAdmin,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'heroImage', maxCount: 1 }
  ]),
  async (req, res) => {
    const { previewTitle, summary, category, sections, contentId } = req.body;
    const thumb = req.files?.thumbnail?.[0];
    const hero = req.files?.heroImage?.[0];

    // ✅ Validate required fields
    if (!previewTitle || !summary || !category || !sections) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields.'
      });
    }

    // ✅ Parse and sanitize sections
    let parsed;
    try {
      parsed = JSON.parse(sections);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sections JSON.'
      });
    }

    if (!Array.isArray(parsed) || !parsed.length) {
      return res.status(400).json({
        success: false,
        error: 'Sections cannot be empty.'
      });
    }

    parsed = parsed
      .map((s, i) => ({
        text: (s?.text ?? '').toString().trim(),
        isQuote: !!s?.isQuote,
        order: Number.isInteger(s?.order) ? s.order : i,
        subtitle: (s?.subtitle ?? '').toString().trim(),
        author: (s?.author ?? '').toString().trim(),
      }))
      .filter(
        s => s.text.length > 0 || s.subtitle.length > 0 || s.author.length > 0
      );

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      let cid;

      // ✅ Update existing article
      if (contentId) {
        const updateContentSQL = `
          UPDATE content
          SET title = $1,
              body = $2,
              category = $3,
              ${thumb ? "thumbnail = $4," : ""}
              updated_at = NOW()
          WHERE id = $${thumb ? 5 : 4} AND type = 'article'
          RETURNING id
        `;
        const contentParams = thumb
          ? [previewTitle, summary, category, `/uploads/${thumb.filename}`, contentId]
          : [previewTitle, summary, category, contentId];

        const resContent = await client.query(updateContentSQL, contentParams);
        if (resContent.rowCount === 0) {
          throw new Error('Article not found for update.');
        }
        cid = resContent.rows[0].id;

        // Remove old sections
        await client.query('DELETE FROM content_article WHERE content_id = $1', [cid]);

        // Insert new sections
        const heroPath = hero
          ? `/uploads/${hero.filename}`
          : await getExistingHeroImage(client, cid);

        if (!heroPath) {
          throw new Error('Hero image missing (provide new one or ensure existing).');
        }

        for (const sec of parsed) {
          await client.query(
            `INSERT INTO content_article
               (content_id, hero_image, section_text, is_quote, section_order, subtitle, author)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [
              cid,
              heroPath,
              sec.text,
              sec.isQuote,
              sec.order,
              sec.subtitle,
              sec.author,
            ]
          );
        }
      } else {
        // ✅ Create new article
        if (!thumb || !hero) {
          return res.status(400).json({
            success: false,
            error: 'Thumbnail and hero image are required for new article.'
          });
        }

        const resContent = await client.query(
          `INSERT INTO content(title, body, category, thumbnail, type, created_at, archived)
           VALUES($1,$2,$3,$4,'article',NOW(), false) RETURNING id`,
          [previewTitle, summary, category, `/uploads/${thumb.filename}`]
        );
        cid = resContent.rows[0].id;

        for (const sec of parsed) {
          await client.query(
            `INSERT INTO content_article
               (content_id, hero_image, section_text, is_quote, section_order, subtitle, author)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [cid, `/uploads/${hero.filename}`, sec.text, sec.isQuote, sec.order, sec.subtitle, sec.author]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({
        success: true,
        id: cid,
        message: contentId ? 'Article updated successfully!' : 'Article published successfully!'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error saving/updating article:', err.message, err.stack);
      res.status(500).json({ success: false, error: err.message || 'Failed to save/update article.' });
    } finally {
      client.release();
    }
  }
);

// ✅ Helper: Get existing hero image
async function getExistingHeroImage(client, contentId) {
  const r = await client.query(
    'SELECT hero_image FROM content_article WHERE content_id = $1 LIMIT 1',
    [contentId]
  );
  return r.rows[0]?.hero_image || '';
}

// Delete article
app.delete('/admin/article/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM content_article WHERE content_id=$1', [id]);
    await client.query('DELETE FROM content WHERE id=$1 AND type=$2', [id, 'article']);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting article:', err);
    res.status(500).json({ success: false, error: 'Failed to delete article.' });
  } finally {
    client.release();
  }
});

// Archive an article
app.post('/admin/article/draft/:id', async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    `UPDATE content SET archived = true, updated_at = NOW()
     WHERE id = $1 AND type = 'article'
     RETURNING id`,
    [id]
  );
  if (result.rowCount === 0)
    return res.status(404).json({ success: false, error: 'Article not found' });
  res.json({ success: true, message: 'Article archived successfully' });
});

// Get single article
app.get('/resources/article/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const contQ = await db.query(
      `SELECT id, title, body AS summary, thumbnail, category
         FROM content
        WHERE id=$1 AND type=$2`,
      [id, 'article']
    );
    if (contQ.rowCount === 0)
      return res.status(404).json({ error: 'Article not found' });

    const artQ = await db.query(
      `SELECT hero_image, section_text, is_quote, section_order, subtitle, author
         FROM content_article
        WHERE content_id=$1
     ORDER BY section_order ASC`,
      [id]
    );

    const content = contQ.rows[0];
    const sections = artQ.rows.map((r, i) => ({
      text: r.section_text || "",
      isQuote: !!r.is_quote,
      subtitle: r.subtitle || "",
      author: r.author || "",
      order: Number.isInteger(r.section_order) ? r.section_order : i
    }));

    res.json({
      id: content.id,
      previewTitle: content.title,
      summary: content.summary,
      thumbnail: content.thumbnail,
      category: content.category,
      heroImage: artQ.rows[0]?.hero_image || '',
      sections
    });
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all non-archived articles
app.get('/resources/articles', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        title                       AS "title",
        title                       AS "previewTitle", 
        body                        AS summary,        
        category,
        thumbnail,
        created_at                  AS "createdAt"
      FROM content
      WHERE type = 'article' AND (archived IS NULL OR archived = false)
      ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles.' });
  }
});


// ======================================
// 10. READING MATERIAL ROUTES
// ======================================

app.post(
  '/admin/reading',
  requireAdmin,
  upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'heroImage', maxCount: 1 }]),
  async (req, res) => {
    const { previewTitle, summary, category, sections, contentId } = req.body;
    const thumb = req.files?.thumbnail?.[0];
    const hero = req.files?.heroImage?.[0];

    // Validate required fields for both new & update
    if (!previewTitle || !summary || !category || !sections) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    let parsed = jsonParseSafe(sections, null);
    if (!Array.isArray(parsed)) {
      return res.status(400).json({ success: false, error: 'Invalid sections JSON.' });
    }

    parsed = parsed
      .map((s, i) => ({
        text: (s?.text ?? '').toString().trim(),
        isQuote: !!s?.isQuote,
        order: Number.isInteger(s?.order) ? s.order : i,
        subtitle: (s?.subtitle ?? '').toString().trim(),
        author: (s?.author ?? '').toString().trim(),
      }))
      .filter(s => s.text.length > 0 || s.subtitle.length > 0 || s.author.length > 0);

    if (!parsed.length) {
      return res.status(400).json({ success: false, error: 'Sections cannot be empty.' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      let cid;

      // ---- If contentId exists => update
      if (contentId) {
        // Update content row
        const updateContentSQL = `
          UPDATE content
          SET title = $1,
              body = $2,
              category = $3,
              ${thumb ? "thumbnail = $4," : ""}
              updated_at = NOW()
          WHERE id = $${thumb ? 5 : 4} AND type = 'reading'
          RETURNING id
        `;
        const contentParams = thumb
          ? [previewTitle, summary, category, `/uploads/${thumb.filename}`, contentId]
          : [previewTitle, summary, category, contentId];

        const resContent = await client.query(updateContentSQL, contentParams);
        if (resContent.rowCount === 0) {
          throw new Error('Reading not found for update.');
        }
        cid = resContent.rows[0].id;

        // Remove old sections
        await client.query('DELETE FROM content_article WHERE content_id = $1', [cid]);

        // Insert new sections
        for (const sec of parsed) {
          await client.query(
            `INSERT INTO content_article
               (content_id, hero_image, section_text, is_quote, section_order, subtitle, author)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [
              cid,
              hero ? `/uploads/${hero.filename}` : (await getExistingHeroImage(client, cid)),
              sec.text,
              sec.isQuote,
              sec.order,
              sec.subtitle,
              sec.author,
            ]
          );
        }
      } else {
        // ---- Create new content row
        if (!thumb || !hero) {
          return res.status(400).json({ success: false, error: 'Thumbnail and hero image are required for new reading.' });
        }

        const resContent = await client.query(
          `INSERT INTO content(title, body, category, thumbnail, type, created_at)
           VALUES($1,$2,$3,$4,'reading',NOW()) RETURNING id`,
          [previewTitle, summary, category, `/uploads/${thumb.filename}`]
        );
        cid = resContent.rows[0].id;

        // Insert sections
        for (const sec of parsed) {
          await client.query(
            `INSERT INTO content_article
               (content_id, hero_image, section_text, is_quote, section_order, subtitle, author)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [cid, `/uploads/${hero.filename}`, sec.text, sec.isQuote, sec.order, sec.subtitle, sec.author]
          );
        }
      }

      await client.query('COMMIT');
      res.status(201).json({
        success: true,
        id: cid,
        message: contentId ? 'Reading material updated successfully!' : 'Reading material saved successfully!',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error saving/updating reading material:', err);
      res.status(500).json({ success: false, error: 'Failed to save/update reading material.' });
    } finally {
      client.release();
    }
  }
);

// Helper to get existing hero image path if not replacing
async function getExistingHeroImage(client, contentId) {
  const r = await client.query(
    'SELECT hero_image FROM content_article WHERE content_id = $1 LIMIT 1',
    [contentId]
  );
  return r.rows[0]?.hero_image || '';
}

// Archive a reading material
app.post('/admin/reading/draft/:id', async (req, res) => {
  const { id } = req.params;
  const result = await db.query(
    `UPDATE content SET archived = true, updated_at = NOW()
     WHERE id = $1 AND type = 'reading'
     RETURNING id`,
    [id]
  );
  if (result.rowCount === 0)
    return res.status(404).json({ success: false, error: 'Reading not found' });
  res.json({ success: true, message: 'Reading archived successfully' });

});

// Delete Reading Material
app.delete('/admin/reading/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM content_article WHERE content_id=$1', [id]);
    await client.query('DELETE FROM content WHERE id=$1 AND type=$2', [id, 'reading']);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting reading material:', err);
    res.status(500).json({ success: false, error: 'Failed to delete reading material.' });
  } finally {
    client.release();
  }
});



app.get('/resources/reading/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const contQ = await db.query(
      `SELECT id, title, body AS summary, thumbnail, category
         FROM content
        WHERE id=$1 AND type=$2`,
      [id, 'reading']
    );
    if (contQ.rowCount === 0)
      return res.status(404).json({ error: 'Reading material not found' });

    const artQ = await db.query(
      `SELECT hero_image, section_text, is_quote, section_order, subtitle, author
         FROM content_article
        WHERE content_id=$1
     ORDER BY section_order ASC`,
      [id]
    );

    const content = contQ.rows[0];
    const sections = artQ.rows.map((r, i) => ({
      text: r.section_text || "",
      isQuote: !!r.is_quote,
      subtitle: r.subtitle || "",
      author: r.author || "",
      order: Number.isInteger(r.section_order) ? r.section_order : i
    }));

    res.json({
      id: content.id,
      previewTitle: content.title,
      summary: content.summary,
      thumbnail: content.thumbnail,
      category: content.category,
      heroImage: artQ.rows[0]?.hero_image || '',
      sections
    });
  } catch (err) {
    console.error('Error fetching reading material:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/resources/reading-materials', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        id,
        title,
        body        AS summary,      
        category,
        thumbnail,
        created_at  AS "createdAt"
      FROM content
      WHERE type = 'reading' AND (archived IS NULL OR archived = false)
      ORDER BY created_at DESC
    `);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fetching readings:', err);
    res.status(500).json({ error: 'Failed to fetch readings.' });
  }
});

// ======================================
// 11. Music
// ======================================

app.post('/admin/music', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 }
]), async (req, res) => {
  const { title, subtitle, category } = req.body;
  const thumb = req.files?.thumbnail?.[0];
  const audio = req.files?.audioFile?.[0];

  if (!title || !subtitle || !category || !thumb || !audio) {
    return res.status(400).json({ success: false, error: 'Missing fields.' });
  }

  try {
    await db.query(`
      INSERT INTO content (title, body, category, thumbnail, audio_file, type, created_at)
      VALUES ($1, $2, $3, $4, $5, 'music', NOW())
    `, [title, subtitle, category, `/uploads/${thumb.filename}`, `/uploads/${audio.filename}`]);

    res.json({ success: true, message: 'Music saved successfully!' });
  } catch (err) {
    console.error('Error saving music:', err);
    res.status(500).json({ success: false, error: 'Database error.' });
  }
});



app.get('/resources/music', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, title, body AS subtitle, thumbnail, category, audio_file
      FROM content
      WHERE type = 'music'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching music:', err);
    res.status(500).json({ error: 'Failed to load music.' });
  }
});

// Delete Music Track
app.delete('/admin/music/:id', async (req, res) => {
  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM content WHERE id = $1 AND type = 'music'`,
      [id]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting music:', err);
    res.status(500).json({ success: false, error: 'Failed to delete music track.' });
  } finally {
    client.release();
  }
});

// Add this endpoint to check if user session is still valid
app.get('/api/session/check', async (req, res) => {
  try {
    // If there's no session or no logged-in user, respond with forceLogout: false
    if (!req.session || !req.session.user) {
      return res.json({ forceLogout: false, code: 'NO_SESSION' });
    }

    const userId = req.session.user.id;
    const { rows } = await db.query('SELECT is_archived FROM users WHERE id = $1', [userId]);
    const userRow = rows[0];

    if (userRow && userRow.is_archived === true) {
      // Destroy session on server
      const sid = req.sessionID;
      req.session.destroy((err) => {
        if (err) console.error('Error destroying session during check', err);
        // Clear cookie on client as well via response
        res.clearCookie('connect.sid');
        return res.json({
          forceLogout: true,
          message: 'Your account has been deactivated by the admin. Please contact support for assistance.',
          code: 'ACCOUNT_ARCHIVED'
        });
      });
      return;
    }

    // Session exists and user not archived
    return res.json({ forceLogout: false, user: req.session.user, code: 'OK' });
  } catch (err) {
    console.error('Session check error', err);
    res.status(500).json({ forceLogout: false, message: 'Server error', code: 'SERVER_ERROR' });
  }
});



// ======================================
// 12. STATIC PAGE & SESSION ROUTES
// ======================================
app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!req.session.user, user: req.session.user || null });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'user', 'userdashboard.html'));
});
app.get('/admin/content.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'content.html'));
});
app.get('/reading-material.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reading-material.html'));
});


app.post('/account/upload-photo', requireLogin, uploadProfilePic.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const filePath = `/uploads/profiles/${req.file.filename}`;
  try {
    await db.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [filePath, req.session.user.id]);
    req.session.user.profile_picture = filePath;

    res.json({ success: true, url: filePath });
  } catch (err) {
    console.error('Error uploading profile photo:', err);
    res.status(500).json({ success: false, error: 'Error uploading photo' });
  }
});


app.post('/account/update-profile', requireLogin, async (req, res) => {
  const { first_name, middle_name, last_name, email, birthday } = req.body;

  try {
    // Handle the 'birthday' field as null if it's not provided
    const result = await db.query(
      `UPDATE users SET first_name=$1, middle_name=$2, last_name=$3, email=$4, birthday=$5
       WHERE id=$6 RETURNING id, first_name, middle_name, last_name, email, birthday`,
      [first_name, middle_name, last_name, email, birthday || null, req.session.user.id] // Set to null if empty
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    req.session.user = {
      ...req.session.user,
      first_name,
      middle_name,
      last_name,
      email,
      birthday
    };

    res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



//UPLOAD PROFILE PICTURE
app.post('/account/profile-picture', uploadProfilePic.single('profile_picture'), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const userId = req.session.user.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const filePath = `/uploads/profiles/${file.filename}`;
  try {
    await db.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [filePath, userId]);

    req.session.user.profile_picture = filePath;
    req.session.save(() => {
      res.json({ success: true, path: filePath });
    });
  } catch (err) {
    console.error('❌ Profile upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile picture' });
  }
});


// ========== ADMIN STATS ==========
// return counts with seq but do not bump seq
app.get('/admin/stats', async (req, res) => {
  try {
    const counts = await getCountsWithMeta();
    // Ensure the response includes fields expected by the client for stats display
    const clientStats = {
      online: counts.online || counts.onlineCount || counts.online_users || 0, // Provide online count or default to 0
      active: counts.users || counts.userCount || 0, // Map 'users' to 'active' for client
      archived: counts.archived || counts.archivedCount || counts.totalArchived || 0,
      // Include all original counts for backward compatibility
      ...counts
    };
    res.json(clientStats);
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({
      users: 0,
      published: 0,
      archived: 0,
      totalArticles: 0,
      seq: statsSeq,
      ts: Date.now(),
      // Include expected fields for client compatibility
      online: 0,
      active: 0
    });
  }
});

// SSE endpoint
app.get('/admin/stats/stream', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  sseClients.add(res);

  try {
    const initial = await getCountsWithMeta();
    res.write(`data: ${JSON.stringify(initial)}\n\n`);
  } catch (err) {
    console.error('Error sending initial stats to SSE client:', err);
  }

  const keepalive = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch (e) { /* ignore */ }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
});

// ========== USER LIST WITH STATS ==========
// Add this to your server.js file - Online user tracking system
const onlineUsers = new Map(); // userId -> { lastSeen, sessionId, userInfo }
const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
// Add this near your onlineUsers tracking
const userLastActive = new Map(); // userId -> last active timestamp

// Update your trackUserActivity middleware to also update last active
const trackUserActivity = (req, res, next) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;
    const now = Date.now();

    onlineUsers.set(userId, {
      lastSeen: now,
      sessionId: req.sessionID,
      userInfo: {
        id: req.session.user.id,
        name: req.session.user.name || `${req.session.user.first_name} ${req.session.user.last_name}`,
        email: req.session.user.email
      }
    });

    // Update last active in database periodically (every 5 minutes max)
    if (!userLastActive.has(userId) || (now - userLastActive.get(userId) > 300000)) {
      userLastActive.set(userId, now);

      // Update database asynchronously (don't wait for response)
      db.query(
        'UPDATE users SET last_active = NOW() WHERE id = $1',
        [userId]
      ).catch(err => console.error('Error updating last active:', err));
    }
  }
  next();
};

// Apply activity tracking to all routes
app.use(trackUserActivity);

// API endpoint for users to ping their online status
app.post('/api/user/heartbeat', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userId = req.session.user.id;
  const now = Date.now();

  onlineUsers.set(userId, {
    lastSeen: now,
    sessionId: req.sessionID,
    userInfo: {
      id: req.session.user.id,
      name: req.session.user.name || `${req.session.user.first_name} ${req.session.user.last_name}`,
      email: req.session.user.email
    }
  });

  // Update last active in database
  try {
    await db.query(
      'UPDATE users SET last_active = NOW() WHERE id = $1',
      [userId]
    );
  } catch (err) {
    console.error('Error updating last active:', err);
  }

  res.json({ success: true, timestamp: now });
});
// Your updated user list API with online status and archive filtering
app.get('/list/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sort = 'newest',
      archived = 'false' // Add archived filter
    } = req.query;

    const offset = (page - 1) * limit;
    const showArchived = archived === 'true';

    let query = `
  SELECT id, first_name, middle_name, last_name, email, 
         profile_picture, created_at, is_archived, archived_at
  FROM users
  WHERE is_archived = $1
`;

    let countQuery = `
  SELECT COUNT(*)::int AS cnt 
  FROM users 
  WHERE is_archived = $1
`;

    const params = [showArchived];  // either true or false
    let paramIndex = 2; // next available index

    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      countQuery += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting
    let orderBy = '';
    switch (sort) {
      case 'oldest':
        orderBy = 'created_at ASC';
        break;
      case 'last_active_recent':
        // You'll need to implement last_active tracking
        orderBy = 'created_at DESC';
        break;
      case 'last_active_oldest':
        orderBy = 'created_at ASC';
        break;
      default: // newest
        orderBy = 'created_at DESC';
    }

    query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [users, totalUsers, archivedCount, published] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, paramIndex - 1)), // Remove limit/offset params
      db.query(`SELECT COUNT(*)::int AS cnt FROM users WHERE is_archived = true`),
      db.query(`SELECT COUNT(*)::int AS cnt FROM content WHERE archived = false OR archived IS NULL`)
    ]);

    // Add online status to each user
    const now = Date.now();
    const usersWithStatus = users.rows.map(user => {
      const onlineData = onlineUsers.get(user.id);
      const isOnline = onlineData && (now - onlineData.lastSeen <= ONLINE_THRESHOLD);

      return {
        ...user,
        isOnline: isOnline,
        last_active: isOnline ? onlineData.lastSeen : user.archived_at || user.created_at,
        status: isOnline ? 'online' : 'offline'
      };
    });

    // Count online users
    let onlineCount = 0;
    for (const [userId, userData] of onlineUsers.entries()) {
      if (now - userData.lastSeen <= ONLINE_THRESHOLD) {
        onlineCount++;
      } else {
        onlineUsers.delete(userId); // Clean up offline users
      }
    }

    res.json({
      users: usersWithStatus,
      total: totalUsers.rows[0].cnt,
      stats: {
        users: totalUsers.rows[0].cnt,
        archived: archivedCount.rows[0].cnt,
        published: published.rows[0].cnt,
        online: onlineCount
      }
    });
  } catch (err) {
    console.error("List users error:", err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});



// Clean up offline users periodically (add this after your routes)
setInterval(() => {
  const now = Date.now();
  for (const [userId, userData] of onlineUsers.entries()) {
    if (now - userData.lastSeen > ONLINE_THRESHOLD) {
      onlineUsers.delete(userId);
    }
  }
}, 60000); // Clean up every minute

// Handle user logout (update your existing logout route or add this)
app.post('/api/user/logout', (req, res) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;
    onlineUsers.delete(userId); // Remove from online users

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

// Admin API to get only online users (bonus endpoint)
app.get('/admin/api/online-users', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  const now = Date.now();
  const onlineUsersList = [];

  // Clean up old entries and build online users list
  for (const [userId, userData] of onlineUsers.entries()) {
    if (now - userData.lastSeen > ONLINE_THRESHOLD) {
      onlineUsers.delete(userId); // Remove offline users
    } else {
      onlineUsersList.push({
        ...userData.userInfo,
        lastSeen: userData.lastSeen,
        isOnline: true
      });
    }
  }

  res.json({
    count: onlineUsersList.length,
    users: onlineUsersList
  });
});

// Get all archived content
app.get('/admin/archived-content', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, type, title, body, thumbnail, category, audio_file,
             author_name, famous_for, country, created_at, updated_at
      FROM content 
      WHERE archived = true 
      ORDER BY updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching archived content:', err);
    res.status(500).json({ error: 'Failed to fetch archived content' });
  }
});

// ======================================
// 13. SERVER START
// ======================================

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;

// ======================================
// 14. PASSWORD HELPERS & ROUTES
// ======================================

// Basic password policy: ≥8 chars, at least 1 number, at least 1 special
function passwordMeetsPolicy(pw) {
  if (typeof pw !== 'string') return { len: false, num: false, spec: false, upper: false, lower: false, ok: false };
  const len = pw.length >= 8;
  const num = /\d/.test(pw);
  const spec = /[~`!@#$%^&*()\-_+=\[\]{}|\\;:"',.<>\/?]/.test(pw);
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  return { len, num, spec, upper, lower, ok: len && num && spec && upper && lower };
}

// Verify current password (UI tries a few endpoints; we support them all)
const verifyCurrentHandler = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ valid: false, error: 'Not logged in' });

  const { current_password } = req.body || {};
  if (!current_password) return res.status(400).json({ valid: false, error: 'Missing current_password' });

  try {
    const q = await db.query('SELECT password FROM users WHERE id = $1', [req.session.user.id]);
    if (q.rowCount === 0) return res.status(401).json({ valid: false, error: 'User not found' });

    const isMatch = await bcrypt.compare(current_password, q.rows[0].password);
    return res.json({ valid: !!isMatch });
  } catch (err) {
    console.error('verifyCurrentHandler error:', err);
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
};

// Support all three probe URLs your frontend may call
app.post(['/account/verify-current', '/auth/verify-password', '/account/check-password'], verifyCurrentHandler);

// Change password
app.post('/account/change-password', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: 'Not logged in' });

  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    // Load user + verify current password
    const userQ = await db.query('SELECT id, password FROM users WHERE id = $1', [req.session.user.id]);
    if (userQ.rowCount === 0) return res.status(401).json({ success: false, error: 'User not found' });

    const isMatch = await bcrypt.compare(current_password, userQ.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'CURRENT_PASSWORD_INVALID',
        error: 'Current password is incorrect'
      });
    }

    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    const policy = passwordMeetsPolicy(new_password);
    if (!policy.ok) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: policy
      });
    }


    // Update password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(new_password, salt);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.session.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('change-password error:', err);
    res.status(500).json({ success: false, error: 'Internal server error while changing password' });
  }
});


// ======================================
// 15. Archive and Publish Helpers
// ======================================

async function updateStatsCounts() {
  try {
    const result = await db.query(`
      SELECT COUNT(*) AS published_count
      FROM content
      WHERE archived IS NULL OR archived = false;
    `);
    const publishedCount = parseInt(result.rows[0].published_count, 10);

    const archivedResult = await db.query(`
      SELECT COUNT(*) AS archived_count
      FROM content
      WHERE archived = true;
    `);
    const archivedCount = parseInt(archivedResult.rows[0].archived_count, 10);

    // Update the stats table
    await db.query(`
      UPDATE stats
      SET published_count = $1, archived_count = $2
      WHERE id = 1
    `, [publishedCount, archivedCount]);

  } catch (err) {
    console.error('Error updating stats:', err);
  }
}
// Admin login API route
app.post('/admin/login', async (req, res) => {
  console.log('Admin login attempt:', req.body.email); // Debug log

  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    // Check if admin exists in the admin table
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email.toLowerCase().trim()] // Normalize email
    );

    if (result.rows.length === 0) {
      console.log('Admin not found:', email); // Debug log
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    const admin = result.rows[0];
    console.log('Admin found:', admin.email); // Debug log

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email); // Debug log
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      });
    }

    // Set admin session
    req.session.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.created_at
    };

    console.log('Admin login successful:', email); // Debug log
    res.json({ success: true });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin dashboard route (protected)
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin', 'adminreports.html'));
});



// Admin logout route
app.get('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login.html');
  });
});
// Test route to check if server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// save Results securely
app.post("/api/save-results", async (req, res) => {
  try {
    // 🔑 Use session user, not client-provided email
    const email = req.session?.user?.email;
    if (!email) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const { overallPct, breakdown, answers } = req.body;

    await db.query(
      "INSERT INTO results (email, overall_pct, breakdown, answers) VALUES ($1, $2, $3, $4)",
      [email, overallPct, JSON.stringify(breakdown), JSON.stringify(answers)]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Save results error:", err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});


// get assessment results (secure)
app.get("/api/results", async (req, res) => {
  try {
    // 🔑 Use session user, not client param
    const email = req.session?.user?.email;
    if (!email) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    console.log("Fetching results for:", email);

    const { rows } = await db.query(
      `SELECT id, overall_pct, breakdown, created_at 
       FROM results 
       WHERE email = $1 
       ORDER BY created_at ASC`,
      [email]
    );

    console.log(`Found ${rows.length} records for ${email}`);

    // Always normalize data shape
    const categories = [
      "Self-Awareness",
      "Self-Regulation",
      "Motivation",
      "Empathy",
      "Social Skills"
    ];

    const transformedData = rows.map(row => {
      let parsedBreakdown = {};

      try {
        if (typeof row.breakdown === "string") {
          parsedBreakdown = JSON.parse(row.breakdown);
        } else if (typeof row.breakdown === "object" && row.breakdown !== null) {
          parsedBreakdown = row.breakdown;
        }
      } catch (e) {
        console.error("Error parsing breakdown JSON:", e);
      }

      // Normalize into object: { "Self-Awareness": 0, ... }
      const normalizedBreakdown = {};
      categories.forEach(category => {
        if (Array.isArray(parsedBreakdown)) {
          // handle old array format: [{ key, pct }]
          const found = parsedBreakdown.find(b => b.key === category);
          normalizedBreakdown[category] = found?.pct || 0;
        } else {
          normalizedBreakdown[category] = parsedBreakdown[category] ?? 0;
        }
      });

      return {
        id: row.id,
        overall_pct: row.overall_pct || 0,
        breakdown: normalizedBreakdown,
        created_at: row.created_at
      };
    });

    res.json(transformedData);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});
//
// Add these chart endpoints to your existing server.js file

// ======================================
// CHART API ENDPOINTS FOR DASHBOARD
// ======================================

// Weekly Active Users Chart Data
app.get('/admin/api/weekly-active-users', async (req, res) => {
  try {
    console.log('Fetching weekly active users data...');

    // Get data for the last 7 weeks
    const result = await db.query(`
      WITH weeks AS (
        SELECT 
          generate_series(
            date_trunc('week', CURRENT_DATE - INTERVAL '6 weeks'),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          ) AS week_start
      ),
      weekly_assessments AS (
        SELECT 
          date_trunc('week', created_at) AS week_start,
          COUNT(DISTINCT email) as active_users,
          COUNT(*) as total_assessments
        FROM results 
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 weeks'
        GROUP BY date_trunc('week', created_at)
      )
      SELECT 
        w.week_start,
        COALESCE(wa.active_users, 0) as active_users,
        COALESCE(wa.total_assessments, 0) as total_assessments,
        'Week ' || (ROW_NUMBER() OVER (ORDER BY w.week_start)) AS week_label,
        TO_CHAR(w.week_start, 'MM/DD') || ' - ' || 
        TO_CHAR(w.week_start + INTERVAL '6 days', 'MM/DD') AS date_range
      FROM weeks w
      LEFT JOIN weekly_assessments wa ON w.week_start = wa.week_start
      ORDER BY w.week_start ASC
    `);

    const weeklyData = result.rows.map(row => {
      // ensure week_start becomes an ISO string (row.week_start may already be a Date or string)
      const weekStartIso = row.week_start ? new Date(row.week_start).toISOString() : null;

      return {
        week: row.week_label,
        // machine-friendly date for charts (ISO); fallback to the textual range if weekStartIso missing
        date: weekStartIso || row.date_range,
        // keep the textual range for Excel/PDF or UI display
        date_label: row.date_range,
        active_users: parseInt(row.active_users) || 0
      };
    });

    console.log('Weekly active users data:', weeklyData);

    res.json({
      success: true,
      data: weeklyData
    });

  } catch (error) {
    console.error('Error fetching weekly active users:', error);

    // Return fallback data structure
    const fallbackData = [];
    for (let i = 1; i <= 7; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 * (7 - i)));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      fallbackData.push({
        week: `Week ${i}`,
        date: weekStart.toISOString(), // use ISO for charts
        date_label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        active_users: Math.floor(Math.random() * 5)
      });
    }

    res.json({
      success: true,
      data: fallbackData
    });
  }
});

// Total Assessments Chart Data  
app.get('/admin/api/total-assessments', async (req, res) => {
  try {
    console.log('Fetching total assessments data...');

    // Get data for the last 7 weeks
    const result = await db.query(`
      WITH weeks AS (
        SELECT 
          generate_series(
            date_trunc('week', CURRENT_DATE - INTERVAL '6 weeks'),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          ) AS week_start
      ),
      weekly_assessments AS (
        SELECT 
          date_trunc('week', created_at) AS week_start,
          COUNT(*) as total_assessments
        FROM results 
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 weeks'
        GROUP BY date_trunc('week', created_at)
      )
      SELECT 
        w.week_start,
        COALESCE(wa.total_assessments, 0) as total_assessments,
        'Week ' || (ROW_NUMBER() OVER (ORDER BY w.week_start)) AS week_label,
        TO_CHAR(w.week_start, 'MM/DD') || ' - ' || 
        TO_CHAR(w.week_start + INTERVAL '6 days', 'MM/DD') AS date_range
      FROM weeks w
      LEFT JOIN weekly_assessments wa ON w.week_start = wa.week_start
      ORDER BY w.week_start ASC
    `);

    const weeklyData = result.rows.map(row => {
      const weekStartIso = row.week_start ? new Date(row.week_start).toISOString() : null;

      return {
        week: row.week_label,
        date: weekStartIso || row.date_range,
        date_label: row.date_range,
        total_assessments: parseInt(row.total_assessments) || 0
      };
    });

    console.log('Weekly assessments data:', weeklyData);

    res.json({
      success: true,
      data: weeklyData
    });

  } catch (error) {
    console.error('Error fetching total assessments:', error);

    // Return fallback data structure
    const fallbackData = [];
    for (let i = 1; i <= 7; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 * (7 - i)));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      fallbackData.push({
        week: `Week ${i}`,
        // machine-friendly ISO date for chart parsing
        date: weekStart.toISOString(),
        // human-readable range for exports/UI
        date_label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        total_assessments: Math.floor(Math.random() * 8) + 2 // Random fallback data 2-10
      });
    }

    res.json({
      success: true,
      data: fallbackData
    });
  }
});

// Replace your /admin/api/assessment-stats endpoint with this debugged version:

app.get('/admin/api/assessment-stats', async (req, res) => {
  try {
    console.log('🔍 Fetching assessment stats summary...');

    // Query 1: Total registered users from users table
    const usersQuery = await db.query(`
      SELECT COUNT(*)::int as total_users
      FROM users
      WHERE is_archived = false
    `);
    console.log('📊 Users query result:', usersQuery.rows[0]);

    // Query 2: Unique assessees from results table
    const assesseesQuery = await db.query(`
      SELECT COUNT(DISTINCT email)::int as unique_assessees
      FROM results
    `);
    console.log('📊 Assessees query result:', assesseesQuery.rows[0]);

    // Query 3: Assessment statistics from results table
    const assessmentsQuery = await db.query(`
      SELECT 
        COUNT(*)::int as total_assessments,
        ROUND(AVG(overall_pct), 1) as avg_score
      FROM results
    `);
    console.log('📊 Assessments query result:', assessmentsQuery.rows[0]);

    // Query 4: Previous week data for comparison
    const prevWeekQuery = await db.query(`
      SELECT 
        COUNT(DISTINCT email)::int as unique_assessees_prev,
        COUNT(*)::int as total_assessments_prev,
        ROUND(AVG(overall_pct), 1) as average_score_prev
      FROM results
      WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
        AND created_at < CURRENT_DATE - INTERVAL '7 days'
    `);
    console.log('📊 Previous week query result:', prevWeekQuery.rows[0]);

    const totalUsers = usersQuery.rows[0]?.total_users || 0;
    const uniqueAssessees = assesseesQuery.rows[0]?.unique_assessees || 0;
    const totalAssessments = assessmentsQuery.rows[0]?.total_assessments || 0;
    const avgScore = assessmentsQuery.rows[0]?.avg_score || 0;

    const prevData = prevWeekQuery.rows[0] || {};

    const responseData = {
      success: true,
      data: {
        unique_users: totalUsers,                          // Total registered users
        unique_assessees: uniqueAssessees,                 // Users who completed assessments
        total_assessments: totalAssessments,               // Total assessments taken
        average_score: avgScore,                           // Average EQ score
        unique_users_prev: totalUsers,                     // For Total Users trend
        unique_assessees_prev: prevData.unique_assessees_prev || uniqueAssessees,
        total_assessments_prev: prevData.total_assessments_prev || totalAssessments,
        average_score_prev: prevData.average_score_prev || avgScore
      }
    };

    console.log('✅ Sending response:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching assessment stats:', error);
    res.json({
      success: true,
      data: {
        unique_users: 0,
        unique_assessees: 0,
        total_assessments: 0,
        average_score: 0,
        unique_users_prev: 0,
        unique_assessees_prev: 0,
        total_assessments_prev: 0,
        average_score_prev: 0
      }
    });
  }
});
// Additional endpoint: Get assessment breakdown by category (bonus)
app.get('/admin/api/assessment-breakdown', async (req, res) => {
  try {
    console.log('Fetching assessment breakdown by category...');

    const result = await db.query(`
      SELECT 
        breakdown,
        created_at
      FROM results 
      WHERE breakdown IS NOT NULL
      ORDER BY created_at DESC
    `);

    const categories = [
      "Self-Awareness",
      "Self-Regulation",
      "Motivation",
      "Empathy",
      "Social Skills"
    ];

    let categoryTotals = {};
    let totalAssessments = 0;

    // Initialize category totals
    categories.forEach(cat => categoryTotals[cat] = 0);

    // Process each result
    result.rows.forEach(row => {
      try {
        let breakdown = {};
        if (typeof row.breakdown === 'string') {
          breakdown = JSON.parse(row.breakdown);
        } else if (typeof row.breakdown === 'object') {
          breakdown = row.breakdown;
        }

        // Handle both array and object formats
        categories.forEach(category => {
          let score = 0;
          if (Array.isArray(breakdown)) {
            const found = breakdown.find(b => b.key === category);
            score = found?.pct || 0;
          } else {
            score = breakdown[category] || 0;
          }
          categoryTotals[category] += score;
        });

        totalAssessments++;
      } catch (e) {
        console.error('Error parsing breakdown:', e);
      }
    });

    // Calculate averages
    const averages = {};
    categories.forEach(cat => {
      averages[cat] = totalAssessments > 0 ?
        Math.round((categoryTotals[cat] / totalAssessments) * 100) / 100 : 0;
    });

    res.json({
      success: true,
      data: {
        category_averages: averages,
        total_assessments: totalAssessments,
        categories: categories
      }
    });

  } catch (error) {
    console.error('Error fetching assessment breakdown:', error);
    res.json({
      success: true,
      data: {
        category_averages: {
          "Self-Awareness": 0,
          "Self-Regulation": 0,
          "Motivation": 0,
          "Empathy": 0,
          "Social Skills": 0
        },
        total_assessments: 0,
        categories: [
          "Self-Awareness",
          "Self-Regulation",
          "Motivation",
          "Empathy",
          "Social Skills"
        ]
      }
    });
  }
});
// Archived users list
app.get("/admin/users/archived", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sort = "Archive Date (Newest)" } = req.query;

    const offset = (page - 1) * limit;
    const params = [true]; // only archived users
    let paramIndex = 2;

    // Base queries
    let query = `
      SELECT id, first_name, middle_name, last_name, email, 
             profile_picture, archived_at
      FROM users
      WHERE is_archived = $1
    `;

    let countQuery = `
      SELECT COUNT(*)::int AS cnt
      FROM users
      WHERE is_archived = $1
    `;

    // Search filter
    if (search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      countQuery += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sorting
    switch (sort) {
      case "Archive Date (Oldest)":
        query += ` ORDER BY archived_at ASC`;
        break;
      case "Name (A-Z)":
        query += ` ORDER BY first_name ASC, last_name ASC`;
        break;
      case "Name (Z-A)":
        query += ` ORDER BY first_name DESC, last_name DESC`;
        break;
      default: // Archive Date (Newest)
        query += ` ORDER BY archived_at DESC`;
        break;
    }

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, paramIndex - 1)) // no limit/offset for count
    ]);

    res.json({
      users: usersResult.rows.map(u => ({
        id: u.id,
        firstName: u.first_name,
        middleName: u.middle_name,
        lastName: u.last_name,
        email: u.email,
        profilePic: u.profile_picture,
        archivedAt: u.archived_at
      })),
      total: countResult.rows[0].cnt
    });

  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to fetch archived users" });
  }
});
// Add this route to your server.js file, around line 1200 (after your other user routes)

// Archive a user (endpoint that the frontend is calling)
app.post('/admin/users/:id/archive', async (req, res) => {
  const { id } = req.params;

  try {
    // Update the user to set is_archived = true and archived_at = NOW()
    const result = await db.query(
      `UPDATE users 
       SET is_archived = true, archived_at = NOW() 
       WHERE id = $1 AND is_archived = false
       RETURNING id, first_name, last_name, email`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or already archived'
      });
    }

    const archivedUser = result.rows[0];

    // Remove from online users tracking
    onlineUsers.delete(parseInt(id));

    // Send email notification to the archived user
    try {
      const emailInfo = await transporter.sendMail({
        from: `"FeelBright Support" <${process.env.MAIL_USER}>`,
        to: archivedUser.email,
        subject: 'Important: Your FeelBright Account Status Update',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">FeelBright</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Account Status Notification</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${archivedUser.first_name},</h2>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Account Temporarily Deactivated</strong>
                </p>
              </div>
              
              <p>We're writing to inform you that your FeelBright account has been temporarily deactivated and marked for review.</p>
              
              <div style="background: white; border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                <h3 style="margin-top: 0; color: #17a2b8;">What this means:</h3>
                <ul style="padding-left: 20px;">
                  <li>Your account is currently inaccessible</li>
                  <li>Your data remains secure and preserved</li>
                  <li>This action is reversible upon review</li>
                  <li>No data has been permanently deleted</li>
                </ul>
              </div>
              
              <div style="background: white; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                <h3 style="margin-top: 0; color: #28a745;">Next Steps:</h3>
                <p style="margin-bottom: 10px;">If you believe this action was taken in error or if you'd like to discuss reactivating your account, please:</p>
                <ul style="padding-left: 20px;">
                  <li>Contact our support team at <a href="mailto:${process.env.MAIL_USER}" style="color: #667eea;">${process.env.MAIL_USER}</a></li>
                  <li>Reference your account email: <strong>${archivedUser.email}</strong></li>
                  <li>Provide any relevant context about your account usage</li>
                </ul>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                  <strong>Account Details:</strong><br>
                  Name: ${archivedUser.first_name} ${archivedUser.last_name}<br>
                  Email: ${archivedUser.email}<br>
                  Action Date: ${new Date().toLocaleDateString()}<br>
                  Status: Temporarily Deactivated
                </p>
              </div>
              
              <p>We understand this may be inconvenient, and we're here to help resolve any concerns you may have. Our support team will respond to your inquiry within 24-48 hours.</p>
              
              <p>Thank you for your understanding.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                  Best regards,<br>
                  <strong>The FeelBright Support Team</strong><br>
                  <a href="mailto:${process.env.MAIL_USER}" style="color: #667eea;">${process.env.MAIL_USER}</a>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
              <p style="margin: 5px 0 0 0;">For support, contact us at <a href="mailto:${process.env.MAIL_USER}" style="color: #667eea;">${process.env.MAIL_USER}</a></p>
            </div>
          </div>
        `,
        // Fallback plain text version
        text: `
Hello ${archivedUser.first_name},

Your FeelBright account has been temporarily deactivated and marked for review.

What this means:
- Your account is currently inaccessible
- Your data remains secure and preserved
- This action is reversible upon review
- No data has been permanently deleted

If you believe this action was taken in error or would like to discuss reactivating your account, please contact our support team at ${process.env.MAIL_USER}.

Account Details:
Name: ${archivedUser.first_name} ${archivedUser.last_name}
Email: ${archivedUser.email}
Action Date: ${new Date().toLocaleDateString()}
Status: Temporarily Deactivated

Thank you for your understanding.

Best regards,
The FeelBright Support Team
${process.env.MAIL_USER}
        `
      });

      console.log(`Archive notification email sent to ${archivedUser.email}, Message ID: ${emailInfo.messageId}`);
    } catch (emailError) {
      console.error(`Failed to send archive notification email to ${archivedUser.email}:`, emailError);
      // Don't fail the archive operation if email fails, but log it
    }

    console.log(`User archived: ${archivedUser.email}`);

    res.json({
      success: true,
      message: `User "${archivedUser.first_name} ${archivedUser.last_name}" has been archived successfully.`,
      user: archivedUser
    });

  } catch (error) {
    console.error('Error archiving user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive user. Please try again.'
    });
  }
});
// Add this route to your server.js file (around line 1300, after your archive route)

// Bulk restore users
app.post('/admin/users/bulk/restore', async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or empty user IDs array'
    });
  }

  try {
    // Create placeholders for the IN clause
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');

    const result = await db.query(
      `UPDATE users 
       SET is_archived = false, archived_at = NULL 
       WHERE id IN (${placeholders}) AND is_archived = true
       RETURNING id, first_name, last_name, email`,
      userIds
    );

    console.log(`Bulk restored ${result.rowCount} users`);

    res.json({
      success: true,
      message: `Successfully restored ${result.rowCount} users.`,
      restoredUsers: result.rows
    });

  } catch (error) {
    console.error('Error bulk restoring users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore users. Please try again.'
    });
  }
});

// Bulk delete users permanently
app.delete('/admin/users/bulk/delete', async (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or empty user IDs array'
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Create placeholders for the IN clause
    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');

    // Get user info before deletion for logging
    const userInfo = await client.query(
      `SELECT id, first_name, last_name, email FROM users WHERE id IN (${placeholders}) AND is_archived = true`,
      userIds
    );

    if (userInfo.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'No archived users found with the provided IDs'
      });
    }

    const users = userInfo.rows;
    const emails = users.map(u => u.email);

    // âœ… CASCADE DELETE: Delete all assessment results for these users
    const emailPlaceholders = emails.map((_, index) => `$${index + 1}`).join(',');
    const resultsDeleted = await client.query(
      `DELETE FROM results WHERE email IN (${emailPlaceholders})`,
      emails
    );
    console.log(`🗑️ Deleted ${resultsDeleted.rowCount} assessment results for ${users.length} users`);

    // Delete the users
    const result = await client.query(
      `DELETE FROM users WHERE id IN (${placeholders}) AND is_archived = true RETURNING id`,
      userIds
    );

    await client.query('COMMIT');

    // Remove from online users tracking
    userIds.forEach(id => onlineUsers.delete(parseInt(id)));

    console.log(`âœ… Bulk deleted ${result.rowCount} users:`, users.map(u => u.email));
    console.log(`🗑️ Total results deleted: ${resultsDeleted.rowCount}`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.rowCount} user(s) and ${resultsDeleted.rowCount} assessment result(s) permanently.`,
      deletedCount: result.rowCount,
      resultsDeleted: resultsDeleted.rowCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk deleting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete users. Please try again.'
    });
  } finally {
    client.release();
  }
});

// Restore a user from archive
app.post('/admin/users/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    // Update the user to set is_archived = false and clear archived_at
    const result = await db.query(
      `UPDATE users 
       SET is_archived = false, archived_at = NULL 
       WHERE id = $1 AND is_archived = true
       RETURNING id, first_name, last_name, email`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or not archived'
      });
    }

    const restoredUser = result.rows[0];

    // Send restoration notification email
    try {
      const emailInfo = await transporter.sendMail({
        from: `"FeelBright Support" <${process.env.MAIL_USER}>`,
        to: restoredUser.email,
        subject: 'Welcome Back! Your FeelBright Account Has Been Restored',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">FeelBright</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Account Restored</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
              <h2 style="color: #065F46; margin-top: 0;">Welcome Back, ${restoredUser.first_name}!</h2>
              
              <div style="background: #D1FAE5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065F46;">
                  <strong>✅ Your account has been successfully restored!</strong>
                </p>
              </div>
              
              <p>Great news! Your FeelBright account has been reactivated and you now have full access to all features.</p>
              
              <div style="background: white; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                <h3 style="margin-top: 0; color: #10B981;">What's Next:</h3>
                <ul style="padding-left: 20px;">
                  <li>You can log in immediately using your existing credentials</li>
                  <li>All your previous data and settings have been preserved</li>
                  <li>Access all resources, assessments, and features</li>
                  <li>Continue your emotional intelligence journey</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/login.html" 
                   style="display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Log In Now
                </a>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #6c757d;">
                  <strong>Account Details:</strong><br>
                  Name: ${restoredUser.first_name} ${restoredUser.last_name}<br>
                  Email: ${restoredUser.email}<br>
                  Restored: ${new Date().toLocaleDateString()}<br>
                  Status: Active
                </p>
              </div>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>We're happy to have you back!</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; color: #6c757d; font-size: 14px;">
                  Best regards,<br>
                  <strong>The FeelBright Team</strong><br>
                  <a href="mailto:${process.env.MAIL_USER}" style="color: #10B981;">${process.env.MAIL_USER}</a>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification.</p>
              <p style="margin: 5px 0 0 0;">For support, contact us at <a href="mailto:${process.env.MAIL_USER}" style="color: #10B981;">${process.env.MAIL_USER}</a></p>
            </div>
          </div>
        `,
        text: `
Welcome Back, ${restoredUser.first_name}!

Your FeelBright account has been successfully restored and you now have full access to all features.

What's Next:
- You can log in immediately using your existing credentials
- All your previous data and settings have been preserved
- Access all resources, assessments, and features
- Continue your emotional intelligence journey

Log in at: ${process.env.BASE_URL || 'http://localhost:3000'}/login.html

Account Details:
Name: ${restoredUser.first_name} ${restoredUser.last_name}
Email: ${restoredUser.email}
Restored: ${new Date().toLocaleDateString()}
Status: Active

If you have any questions, contact us at ${process.env.MAIL_USER}.

We're happy to have you back!

Best regards,
The FeelBright Team
        `
      });

      console.log(`Restoration notification email sent to ${restoredUser.email}, Message ID: ${emailInfo.messageId}`);
    } catch (emailError) {
      console.error(`Failed to send restoration notification email to ${restoredUser.email}:`, emailError);
      // Don't fail the restore operation if email fails
    }

    console.log(`User restored: ${restoredUser.email}`);

    res.json({
      success: true,
      message: `User "${restoredUser.first_name} ${restoredUser.last_name}" has been restored successfully.`,
      user: restoredUser
    });

  } catch (error) {
    console.error('Error restoring user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore user. Please try again.'
    });
  }
});


// Delete single user permanently
app.delete('/admin/users/:id/delete', async (req, res) => {
  const { id } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get user info before deletion
    const userInfo = await client.query(
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_archived = true',
      [id]
    );

    if (userInfo.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'User not found or not archived'
      });
    }

    const user = userInfo.rows[0];

    // âœ… CASCADE DELETE: Delete all assessment results for this user
    const resultsDeleted = await client.query(
      'DELETE FROM results WHERE email = $1',
      [user.email]
    );
    console.log(`🗑️ Deleted ${resultsDeleted.rowCount} assessment results for user ${user.email}`);

    // Delete the user
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');

    // Remove from online users tracking
    onlineUsers.delete(parseInt(id));

    console.log(`âœ… User permanently deleted: ${user.email} (including ${resultsDeleted.rowCount} results)`);

    res.json({
      success: true,
      message: `User "${user.first_name} ${user.last_name}" and ${resultsDeleted.rowCount} assessment result(s) have been permanently deleted.`,
      user: user,
      resultsDeleted: resultsDeleted.rowCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user. Please try again.'
    });
  } finally {
    client.release();
  }
});

// Add this to your server.js file - PDF generation route using email instead of result ID


// PDF generation route that uses email instead of result ID
app.post('/api/results/download-pdf', async (req, res) => {
  try {
    // Verify user authentication
    const email = req.session?.user?.email;
    if (!email) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get data from request body (fresh assessment data)
    const { overallPct, breakdown } = req.body;

    if (!overallPct || !breakdown) {
      return res.status(400).json({ error: "Missing assessment data" });
    }

    // Get user details from database
    const userResult = await db.query(
      `SELECT first_name, last_name, email, profile_picture 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Parse breakdown data
    const categories = [
      "Self-Awareness",
      "Self-Regulation",
      "Motivation",
      "Empathy",
      "Social Skills"
    ];

    const normalizedBreakdown = {};
    categories.forEach(category => {
      if (Array.isArray(breakdown)) {
        const found = breakdown.find(b => b.key === category);
        normalizedBreakdown[category] = found?.pct || 0;
      } else {
        normalizedBreakdown[category] = breakdown[category] || 0;
      }
    });

    // Generate HTML template for PDF
    const htmlTemplate = generateReportHTML(user, { overall_pct: overallPct, created_at: new Date() }, normalizedBreakdown);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Set response headers for PDF download
    const fileName = `EI-Assessment-Report-${user.first_name}-${user.last_name}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdf.length);

    res.end(pdf);

  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Function to generate HTML template matching your design
// Replace the existing generateReportHTML function in your server.js with this enhanced version

function generateReportHTML(user, result, breakdown) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Exceptional';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981'; // Emerald green
    if (score >= 70) return '#059669'; // Darker emerald
    if (score >= 60) return '#F59E0B'; // Amber
    if (score >= 50) return '#EF4444'; // Red
    return '#DC2626'; // Dark red
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Self-Awareness': '#60A5FA',
      'Self-Regulation': '#34D399',
      'Motivation': '#FBBF24',
      'Empathy': '#A78BFA',
      'Social Skills': '#10B981'
    };
    return colors[category] || '#6B7280';
  };

  const getOverallInterpretation = (score) => {
    if (score >= 85) return 'Exceptional Emotional Intelligence';
    if (score >= 70) return 'Strong Emotional Intelligence';
    if (score >= 55) return 'Moderate Emotional Intelligence';
    if (score >= 40) return 'Developing Emotional Intelligence';
    return 'Needs Significant Development';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const overallScore = result.overall_pct;
  const interpretation = getOverallInterpretation(overallScore);
  const initials = getInitials(`${user.first_name} ${user.last_name}`);

  // Calculate category insights
  const categoryEntries = Object.entries(breakdown);
  const topCategory = categoryEntries.reduce((prev, current) => (prev[1] > current[1]) ? prev : current);
  const lowCategory = categoryEntries.reduce((prev, current) => (prev[1] < current[1]) ? prev : current);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Emotional Intelligence Assessment Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: A4;
            margin: 15mm;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: linear-gradient(135deg, #f8fbfb 0%, #f0faf0 50%, #f8fbfb 100%);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            border-radius: 12px;
            position: relative;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #10B981;
            position: relative;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 15px;
        }
        
        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #10B981, #059669);
            border-radius: 50%;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }
        
        .brand-name {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #10B981, #059669);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: #10B981;
        }
        
        .report-title {
            font-size: 24px;
            color: #065F46;
            font-weight: 700;
            margin: 15px 0;
            letter-spacing: -0.025em;
        }
        
        .participant-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.02));
            border-radius: 12px;
            border: 1px solid rgba(16, 185, 129, 0.1);
        }
        
        .participant-info {
            flex: 1;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-size: 11px;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 3px;
        }
        
        .info-value {
            font-size: 14px;
            color: #111827;
            font-weight: 600;
        }
        
        .participant-avatar {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10B981, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-left: 20px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }
        
        .overall-score-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.03));
            border-radius: 16px;
            border: 2px solid rgba(16, 185, 129, 0.15);
            position: relative;
        }
        
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10B981, #059669);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px;
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }
        
        .score-number {
            font-size: 32px;
            font-weight: 800;
            color: white;
            line-height: 1;
        }
        
        .score-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .score-interpretation {
            font-size: 18px;
            font-weight: 700;
            color: #065F46;
            margin-top: 10px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 700;
            margin: 30px 0 20px 0;
            color: #111827;
            border-bottom: 2px solid #F3F4F6;
            padding-bottom: 8px;
        }
        
        .categories-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .category-item {
            background: white;
            border-radius: 12px;
            padding: 18px;
            border: 1px solid #E5E7EB;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
            position: relative;
            overflow: hidden;
        }
        
        .category-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--category-color);
        }
        
        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .category-name {
            font-weight: 700;
            font-size: 16px;
            color: #111827;
        }
        
        .category-score {
            font-size: 18px;
            font-weight: 800;
            color: var(--category-color);
        }
        
        .progress-container {
            margin-bottom: 8px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #F3F4F6;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--category-color);
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .category-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
        }
        
        .score-badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.025em;
        }
        
        .insights-section {
            margin-top: 25px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.02));
            border-radius: 12px;
            border: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        .insights-title {
            font-size: 16px;
            font-weight: 700;
            color: #1E40AF;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
        }
        
        .insights-content {
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #F3F4F6;
            text-align: center;
        }
        
        .footer-brand {
            font-weight: 700;
            color: #10B981;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .footer-disclaimer {
            font-size: 11px;
            color: #6B7280;
            line-height: 1.5;
            font-style: italic;
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(16, 185, 129, 0.03);
            font-weight: 900;
            z-index: 0;
            pointer-events: none;
        }
        
        .content {
            position: relative;
            z-index: 1;
        }
        
        @media print {
            body { background: white !important; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="watermark">FeelBright</div>
    <div class="container">
        <div class="content">
            <div class="header">
                <div class="logo-section">
                    <div class="logo-icon">
                    <img src="public\img\fb-tabs-icn.png"></div>
                    <div class="brand-name">FeelBright</div>
                </div>
                <h1 class="report-title">Emotional Intelligence Assessment Report</h1>
            </div>
            
            <div class="participant-section">
                <div class="participant-info">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Participant Name</div>
                            <div class="info-value">${user.first_name} ${user.last_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email Address</div>
                            <div class="info-value">${user.email}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Assessment Date</div>
                            <div class="info-value">${formatDate(result.created_at)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Overall EI Score</div>
                            <div class="info-value" style="color: ${getScoreColor(overallScore)}; font-size: 16px;">${overallScore}%</div>
                        </div>
                    </div>
                </div>
                <div class="participant-avatar">
                    ${initials}
                </div>
            </div>
            
            <div class="overall-score-section">
                <div class="score-circle">
                    <div class="score-number">${overallScore}%</div>
                    <div class="score-label">EI Score</div>
                </div>
                <div class="score-interpretation">${interpretation}</div>
            </div>
            
            <h2 class="section-title">Category Analysis</h2>
            
            <div class="categories-grid">
                ${Object.entries(breakdown).map(([category, score]) => {
    const color = getCategoryColor(category);
    const label = getScoreLabel(score);
    return `
                    <div class="category-item" style="--category-color: ${color}">
                        <div class="category-header">
                            <div class="category-name">${category}</div>
                            <div class="category-score">${score}%</div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${score}%; background: ${color};"></div>
                            </div>
                        </div>
                        <div class="category-details">
                            <span class="score-badge" style="background: ${color}20; color: ${color};">
                                ${label}
                            </span>
                            <span style="color: #6B7280;">Score: ${score}/100</span>
                        </div>
                    </div>
                  `;
  }).join('')}
            </div>
            
            <div class="insights-section">
                <div class="insights-title">
                    💡 Key Insights
                </div>
                <div class="insights-content">
                    <p><strong>Overall Performance:</strong> Your emotional intelligence score of ${overallScore}% indicates ${interpretation.toLowerCase()}. This comprehensive assessment evaluated your capabilities across five core emotional intelligence domains.</p>
                    
                    <p style="margin-top: 12px;"><strong>Strongest Area:</strong> ${topCategory[0]} (${topCategory[1]}% - ${getScoreLabel(topCategory[1])}) represents your most developed emotional intelligence capability.</p>
                    
                    <p style="margin-top: 12px;"><strong>Growth Opportunity:</strong> ${lowCategory[0]} (${lowCategory[1]}% - ${getScoreLabel(lowCategory[1])}) presents the greatest opportunity for focused development and improvement.</p>
                    
                    <p style="margin-top: 12px;"><strong>Recommendation:</strong> Continue building upon your strengths while dedicating focused attention to developing your growth areas. Consider targeted exercises, mindfulness practices, and seeking feedback to enhance your overall emotional intelligence.</p>
                </div>
            </div>
            
            <div class="footer">
                <div class="footer-brand">© FeelBright Emotional Intelligence Assessment Platform</div>
                <div class="footer-disclaimer">
                    This report summarizes your self-assessment responses and provides estimated emotional intelligence indicators for personal development purposes. Results are based on your honest self-evaluation and should be considered alongside professional guidance for comprehensive personal growth planning.
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}
// Send inactivity warning email to user
app.post('/admin/users/:id/send-inactivity-warning', async (req, res) => {
  const { id } = req.params;
  const { inactiveDays } = req.body; // Optional: days of inactivity

  try {
    // Get user info
    const result = await db.query(
      `SELECT id, first_name, last_name, email, last_active, created_at
       FROM users 
       WHERE id = $1 AND is_archived = false`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or already archived'
      });
    }

    const user = result.rows[0];

    // Calculate inactivity period
    const lastActive = user.last_active || user.created_at;
    const daysSinceActive = Math.floor((Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24));

    // Send warning email
    const emailInfo = await transporter.sendMail({
      from: `"FeelBright Support" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Important: Account Inactivity Notice - FeelBright',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">FeelBright</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Account Inactivity Notice</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <h2 style="color: #92400E; margin-top: 0;">Hello ${user.first_name},</h2>
            
            <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E;">
                <strong>⚠️ We've Noticed You Haven't Been Active Recently</strong>
              </p>
            </div>
            
            <p>We noticed that it's been approximately <strong>${daysSinceActive} days</strong> since you last accessed your FeelBright account. We wanted to reach out to check in with you!</p>
            
            <div style="background: white; border-left: 4px solid #F59E0B; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
              <h3 style="margin-top: 0; color: #D97706;">Why This Matters:</h3>
              <p style="margin-bottom: 10px;">To maintain an active and engaged community, we periodically review inactive accounts. If your account remains inactive for an extended period, it may be automatically archived.</p>
              <ul style="padding-left: 20px; margin: 10px 0;">
                <li>Archived accounts lose access to all platform features</li>
                <li>Your progress and data will be preserved</li>
                <li>You can always request reactivation by contacting support</li>
              </ul>
            </div>
            
            <div style="background: white; border-left: 4px solid #10B981; padding: 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
              <h3 style="margin-top: 0; color: #059669;">Keep Your Account Active:</h3>
              <p style="margin-bottom: 15px;">Simply log in to your account to keep it active and continue your emotional intelligence journey!</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.BASE_URL}" 
                   style="display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Log In Now
                </a>
              </div>
            </div>
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                <strong>Account Details:</strong><br>
                Name: ${user.first_name} ${user.last_name}<br>
                Email: ${user.email}<br>
                Last Active: ${new Date(lastActive).toLocaleDateString()}<br>
                Days Inactive: ${daysSinceActive}
              </p>
            </div>
            
            <p>If you're no longer interested in using FeelBright or have any concerns, please feel free to reach out to our support team. We're here to help!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                Best regards,<br>
                <strong>The FeelBright Team</strong><br>
                <a href="mailto:${process.env.MAIL_USER}" style="color: #F59E0B;">${process.env.MAIL_USER}</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
            <p style="margin: 0;">This is an automated notification regarding your account activity.</p>
            <p style="margin: 5px 0 0 0;">For support, contact us at <a href="mailto:${process.env.MAIL_USER}" style="color: #F59E0B;">${process.env.MAIL_USER}</a></p>
          </div>
        </div>
      `,
      text: `
Hello ${user.first_name},

We noticed that it's been approximately ${daysSinceActive} days since you last accessed your FeelBright account.

Why This Matters:
To maintain an active and engaged community, we periodically review inactive accounts. If your account remains inactive for an extended period, it may be automatically archived.

What This Means:
- Archived accounts lose access to all platform features
- Your progress and data will be preserved
- You can always request reactivation by contacting support

Keep Your Account Active:
Simply log in to your account to keep it active and continue your emotional intelligence journey!

Log in at: ${process.env.BASE_URL}

Account Details:
Name: ${user.first_name} ${user.last_name}
Email: ${user.email}
Last Active: ${new Date(lastActive).toLocaleDateString()}
Days Inactive: ${daysSinceActive}

If you have any questions or concerns, please contact us at ${process.env.MAIL_USER}.

Best regards,
The FeelBright Team
      `
    });

    console.log(`Inactivity warning email sent to ${user.email}, Message ID: ${emailInfo.messageId}`);

    res.json({
      success: true,
      message: `Inactivity warning sent to ${user.first_name} ${user.last_name} (${user.email})`,
      emailSent: true,
      daysSinceActive
    });

  } catch (error) {
    console.error('Error sending inactivity warning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send inactivity warning. Please try again.'
    });
  }
});
async function getStats() {
  try {
    const response = await fetch("http://localhost:3000/admin/stats"); // Use the full URL
    const data = await response.json();
    console.log('Stats:', data);
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// Call the function to get stats on page load or on an interval
getStats();