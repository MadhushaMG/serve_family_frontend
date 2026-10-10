import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { QrProfile } from "../db/models/QrProfile";
import crypto from "crypto";

export const updateQrSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { displayName, phoneNumber, otherDetails, showDetails, isActive } = req.body;
        const userId = req.user!.userId;

        let profile = await QrProfile.findOne({ where: { userId } });

        if (!profile) {
            const uniqueCode = crypto.randomBytes(4).toString('hex');
            profile = await QrProfile.create({
                userId,
                uniqueCode,
                displayName,
                phoneNumber,
                otherDetails,
                showDetails,
                isActive
            });
        } else {
            await profile.update({
                displayName,
                phoneNumber,
                otherDetails,
                showDetails,
                isActive
            });
        }

        return res.json({ success: true, message: "Settings updated", data: profile });
    } catch (error) {
        console.error("QR Update Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getPublicQrPage = async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const profile = await QrProfile.findOne({ where: { uniqueCode: code, isActive: true } });

        if (!profile) return res.send("<h1>Profile not found</h1>");

        res.send(`


<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.displayName} | ServeFamily</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(160deg, #e6f4ec 0%, #f0f7ff 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 2rem 1rem;
    }
    .card {
      background: #fff; border-radius: 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      width: 100%; max-width: 420px; overflow: hidden;
    }
    .hdr {
      background: #1a7a3c; padding: 32px 24px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .logo-bg {
      background: #fff; border-radius: 12px; padding: 9px 18px; display: inline-flex;
    }
    .logo-bg img { height: 32px; width: auto; }
    .avatar-ring {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(255,255,255,0.15); border: 2.5px solid rgba(255,255,255,0.45);
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-ring span { font-size: 28px; font-weight: 500; color: #fff; letter-spacing: 1px; }
    .hdr-name { font-size: 21px; font-weight: 600; color: #fff; text-align: center; }
    .hdr-role { font-size: 12px; color: rgba(255,255,255,0.65); text-align: center; }
    .badge-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .badge {
      font-size: 11px; padding: 3px 10px; border-radius: 20px;
      color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.18);
      border: 0.5px solid rgba(255,255,255,0.3);
    }
    .body { padding: 22px 22px 26px; display: flex; flex-direction: column; gap: 14px; }
    .info-box {
      background: #f7f8f9; border-radius: 12px; padding: 14px 16px;
      font-size: 14px; line-height: 1.65; color: #555;
      border: 0.5px solid rgba(0,0,0,0.07);
    }
    .divider { height: 0.5px; background: rgba(0,0,0,0.08); }
    .btn-call {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: #1a7a3c; color: #fff; padding: 16px; border-radius: 13px;
      font-size: 17px; font-weight: 600; text-decoration: none; border: none;
      cursor: pointer; width: 100%; transition: background .18s, transform .1s;
    }
    .btn-call:hover { background: #145e2e; }
    .btn-call:active { transform: scale(0.98); }
    .ph-icon {
      width: 22px; height: 22px; background: rgba(255,255,255,0.18);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .app-label { font-size: 11px; color: #aaa; text-align: center; letter-spacing: 0.4px; }
    .app-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .app-btn {
      display: flex; align-items: center; gap: 9px;
      background: #fff; border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 12px; padding: 10px 14px; text-decoration: none;
      transition: background .15s; cursor: pointer;
    }
    .app-btn:hover { background: #f5f5f5; }
    .app-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .app-icon.android { background: #e6f4ea; }
    .app-icon.ios { background: #e9eaf8; }
    .app-txt span:first-child { font-size: 10px; color: #999; display: block; }
    .app-txt span:last-child { font-size: 13px; font-weight: 600; color: #222; display: block; }
    .footer { font-size: 11px; color: #bbb; text-align: center; }
    @media (max-width: 380px) {
      .hdr-name { font-size: 18px; }
      .app-btns { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <div class="logo-bg">
        <img src="https://servefamily.com/_next/image?url=%2FlogoHeader.png&w=256&q=75" alt="ServeFamily">
      </div>
      <div class="avatar-ring"><span id="av">JD</span></div>
      <div class="hdr-name">${profile.displayName}</div>
      <div class="hdr-role">ServeFamily Member</div>
      <div class="badge-row">
        <span class="badge">✓ Verified member</span>
        <span class="badge">Family services</span>
      </div>
    </div>

    <div class="body">
      <div class="info-box">${profile.otherDetails || 'Trusted ServeFamily member ready to connect and serve.'}</div>
      <div class="divider"></div>

      <a href="tel:${profile.phoneNumber}" class="btn-call">
        <div class="ph-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.1 2.18 2 2 0 012.11 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </div>
        Call now
      </a>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="app-label">Download the ServeFamily app</div>
        <div class="app-btns">
          <a href="https://play.google.com/store/apps/details?id=com.servefamily" class="app-btn">
            <div class="app-icon android">
              <!-- Google Play SVG icon here -->
            </div>
            <div class="app-txt">
              <span>Get it on</span><span>Google Play</span>
            </div>
          </a>
          <a href="https://apps.apple.com/app/servefamily" class="app-btn">
            <div class="app-icon ios">
              <!-- Apple icon here -->
            </div>
            <div class="app-txt">
              <span>Download on the</span><span>App Store</span>
            </div>
          </a>
        </div>
      </div>

      <div class="footer">servefamily.com</div>
    </div>
  </div>

  <script>
    var name = "${profile.displayName}" || "John Doe";
    var parts = name.trim().split(/\s+/);
    var initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
    document.getElementById('av').textContent = initials;
  </script>
</body>
</html>


        `);
    } catch (error) {
        return res.status(500).send("<h1>Server Error</h1>");
    }
};
