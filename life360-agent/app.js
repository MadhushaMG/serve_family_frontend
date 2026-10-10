/* ===========================================
   SERVE FAMILY AGENT PORTAL - JAVASCRIPT
   =========================================== */

const API_BASE_URL = window.location.origin;
const API_BASE = API_BASE_URL;

// Live In-App Camera State
let activeCameraStream = null;
let currentCameraFacing = 'environment'; // 'environment' (back) | 'user' (front)
let activeCameraConfig = null;
let capturedSnapshotBlob = null;

let agentToken = localStorage.getItem('servefamily_agent_token') || '';
let currentAgent = null;
let currentAgentTab = 'agent-approve';
let agentVehicles = [];
let vehicleTypesList = [];
let currentFilter = 'all'; // 'all' | 'pending' | 'approved' | 'rejected'

// Pending action modal state
let pendingAction = null; // { type: 'approve'|'reject', vehicleId, driverName, plateNum }

document.addEventListener('DOMContentLoaded', () => {
  const savedToken = localStorage.getItem('servefamily_agent_token');
  const savedAgent = localStorage.getItem('servefamily_agent_data');
  if (savedToken && savedAgent) {
    agentToken = savedToken;
    try { currentAgent = JSON.parse(savedAgent); } catch {}
    showAgentDashboard();
  } else {
    showAgentLoginPage();
  }
});

/* ================= API REQUEST WRAPPER ================= */
async function agentApiRequest(path, method = 'GET', body = null) {
  let url = API_BASE_URL + path;
  if (method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
  }
  const headers = { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };
  if (agentToken) headers['Authorization'] = `Bearer ${agentToken}`;

  const opts = { method, headers, cache: 'no-store' };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    let data;
    try { data = await res.json(); } catch { data = { raw: await res.text() }; }

    if (res.status === 401 && path !== '/api/auth/login') {
      agentToken = ''; 
      currentAgent = null;
      localStorage.removeItem('servefamily_agent_token');
      localStorage.removeItem('servefamily_agent_data');
      showAgentLoginPage();
      toast('Session expired. Please sign in again.', 'warning');
    }

    if (res.status === 403) {
      toast(data?.message || 'Access denied: You do not have permission for this regional agent action.', 'error');
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

/* ================= AUTH & LOGIN ================= */
async function handleAgentLogin(e) {
  e.preventDefault();
  const email = document.getElementById('agent-login-email').value.trim();
  const password = document.getElementById('agent-login-password').value;
  const errEl = document.getElementById('agent-login-error');
  const btn = document.getElementById('agent-login-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');

  errEl.classList.add('hidden');
  btn.disabled = true;
  if (btnText) btnText.classList.add('hidden');
  if (btnLoader) btnLoader.classList.remove('hidden');

  try {
    const res = await agentApiRequest('/api/auth/login', 'POST', { email, password });
    if (res.ok && (res.data?.token || res.data?.accessToken)) {
      const token = res.data.token || res.data.accessToken;
      const user = res.data.user || { email, name: email.split('@')[0] };

      // Verify user has Agent or Admin authority
      const userRole = (user.role || user.metadata?.role || '').toLowerCase();
      const isAuthorized = userRole === 'agent' || userRole === 'admin' || userRole === 'superadmin' || 
                           user.agentProfile || email === 'admin@servefamily.com' || email.toLowerCase().includes('agent');

      if (!isAuthorized) {
        errEl.textContent = 'Access Denied: This portal is reserved for authorized Regional Agents. Your account does not have agent permissions.';
        errEl.classList.remove('hidden');
        return;
      }

      agentToken = token;
      currentAgent = user;
      localStorage.setItem('servefamily_agent_token', token);
      localStorage.setItem('servefamily_agent_data', JSON.stringify(user));

      showAgentDashboard();
      toast('Welcome to Regional Agent Portal', 'success');
    } else {
      errEl.textContent = res.data?.message || 'Login failed. Invalid Agent credentials.';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    errEl.textContent = 'Network error during login: ' + err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (btnText) btnText.classList.remove('hidden');
    if (btnLoader) btnLoader.classList.add('hidden');
  }
}

function toggleAgentPassword() {
  const pwd = document.getElementById('agent-login-password');
  const icon = document.getElementById('eye-icon');
  if (!pwd) return;
  if (pwd.type === 'password') {
    pwd.type = 'text';
    if (icon) {
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    }
  } else {
    pwd.type = 'password';
    if (icon) {
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
}

function showAgentLoginPage() {
  document.getElementById('login-page').classList.add('active');
  document.getElementById('dashboard-page').classList.remove('active');
}

function showAgentDashboard() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('dashboard-page').classList.add('active');

  if (currentAgent) {
    const name = currentAgent.name || currentAgent.email || 'Regional Agent';
    document.getElementById('agent-display-name').textContent = name;
    document.getElementById('agent-avatar-char').textContent = name.charAt(0).toUpperCase();

    const regionLabel = document.getElementById('agent-region-label');
    if (regionLabel) {
      const loc = currentAgent.agentProfile?.locationName || currentAgent.agentProfile?.district || 'Regional Agent';
      regionLabel.textContent = loc;
    }
  }

  loadVehicleTypes();
  switchAgentTab(currentAgentTab);
}

function handleAgentLogout() {
  agentToken = '';
  currentAgent = null;
  localStorage.removeItem('servefamily_agent_token');
  localStorage.removeItem('servefamily_agent_data');
  showAgentLoginPage();
  toast('Logged out from Agent Portal', 'info');
}

/* ================= NAVIGATION & TABS ================= */
function switchAgentTab(tab) {
  currentAgentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-' + tab)?.classList.add('active');

  // Sync native mobile bottom app navigation
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('bnav-' + tab)?.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');

  const labels = {
    'agent-approve': 'Search & Approve Driver',
    'agent-fleet': 'Regional Registered Drivers'
  };
  document.getElementById('agent-breadcrumb-text').textContent = labels[tab] || tab;
  loadAgentTabData(tab);
}

function openMobileRegister() {
  const panel = document.getElementById('register-driver-panel');
  if (panel) {
    panel.classList.remove('collapsed');
    panel.classList.add('expanded');
    const label = document.getElementById('reg-btn-label');
    const icon = document.getElementById('reg-btn-icon');
    if (label) label.textContent = 'Close Registration';
    if (icon) icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    loadVehicleTypes();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function loadAgentTabData(tab) {
  await loadAgentVehicles();
  // In the 'agent-approve' tab, keep the initial clean idle guidance state.
  // Driver details are only loaded when an agent explicitly searches a full mobile or vehicle plate.
}

/* ================= MOBILE SIDEBAR ================= */
function toggleMobileSidebar() {
  const sidebar = document.getElementById('agent-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    const isOpen = sidebar.classList.toggle('open');
    if (isOpen) {
      backdrop.classList.add('active');
    } else {
      backdrop.classList.remove('active');
    }
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('agent-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

/* ================= VEHICLE TYPES ================= */
async function loadVehicleTypes() {
  let res = await agentApiRequest('/api/taxi/vehicle-types');
  if (!res.ok || (!Array.isArray(res.data?.data) && !Array.isArray(res.data))) {
    res = await agentApiRequest('/api/admin/taxi/vehicle-types');
  }
  const select = document.getElementById('reg-vehicle-type');
  if (!select) return;

  const dataArr = res.data?.data || (Array.isArray(res.data) ? res.data : []);

  if (res.ok && dataArr.length > 0) {
    vehicleTypesList = dataArr;
    // Sort Tuk to the top since it's the primary taxi vehicle in Sri Lanka
    const sortedTypes = [...vehicleTypesList].sort((a, b) => {
      const aIsTuk = (a.type || '').toLowerCase().includes('tuk');
      const bIsTuk = (b.type || '').toLowerCase().includes('tuk');
      if (aIsTuk && !bIsTuk) return -1;
      if (!aIsTuk && bIsTuk) return 1;
      return 0;
    });

    select.innerHTML = sortedTypes.map(vt => {
      const isTuk = (vt.type || '').toLowerCase().includes('tuk');
      return `<option value="${vt.id}" ${isTuk ? 'selected' : ''}>${vt.type} (${vt.category === 'hire' ? 'Hire' : 'Transport'})${isTuk ? ' (Default)' : ''}</option>`;
    }).join('');
  } else {
    select.innerHTML = '<option value="290f259b-1e8d-416e-8599-ee377e135b6d" selected>Tuk (Three-Wheeler)</option>';
  }
}

/* ================= DATA LOADING & STATS ================= */
async function loadAgentVehicles() {
  const res = await agentApiRequest('/api/admin/taxi/vehicles?limit=500');
  if (res.ok && res.data?.data) {
    agentVehicles = res.data.data;
    renderAgentFleetTable(agentVehicles);
    updateAgentStats(agentVehicles);
  }
}

function updateAgentStats(vehicles) {
  const total = vehicles.length;
  const approved = vehicles.filter(v => v.approvalStatus === 'approved').length;
  const pending = vehicles.filter(v => (v.approvalStatus || 'pending') === 'pending').length;
  const rejected = vehicles.filter(v => v.approvalStatus === 'rejected').length;

  document.getElementById('ag-total-taxis').textContent = total;
  document.getElementById('ag-approved-taxis').textContent = approved;
  document.getElementById('ag-pending-taxis').textContent = pending;

  // Update mobile bottom nav badge
  const bnavBadge = document.getElementById('bnav-pending-badge');
  if (bnavBadge) {
    if (pending > 0) {
      bnavBadge.textContent = pending > 99 ? '99+' : pending;
      bnavBadge.style.display = 'inline-block';
    } else {
      bnavBadge.style.display = 'none';
    }
  }

  // Update filter pill counters
  const pillAll = document.getElementById('pill-all-count');
  const pillPend = document.getElementById('pill-pending-count');
  const pillApp = document.getElementById('pill-approved-count');
  const pillRej = document.getElementById('pill-rejected-count');

  if (pillAll) pillAll.textContent = total;
  if (pillPend) pillPend.textContent = pending;
  if (pillApp) pillApp.textContent = approved;
  if (pillRej) pillRej.textContent = rejected;
}

/* ================= UNIFIED AGENT DRIVER LOOKUP & APPROVAL ================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAgentIdleStateHtml() {
  return `
    <div class="agent-search-idle-card" id="agent-search-idle-state">
      <div class="agent-idle-icon-wrap">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>
      <h3>Search Driver to Inspect & Approve</h3>
      <p>Enter the driver's complete 10-digit mobile phone number or vehicle registration plate above to load their credentials.</p>
      <div class="idle-guidance-tags">
        <span class="idle-tag">Exact Full Matches Only</span>
        <span class="idle-tag">One-Click Instant Approval</span>
        <span class="idle-tag">All 9 Provinces & 25 Districts</span>
      </div>
    </div>
  `;
}

function handleAgentDriverSearchInput(value) {
  const clearBtn = document.getElementById('agent-driver-clear-btn');
  const query = (value || '').trim();
  if (clearBtn) {
    if (query) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  // If the agent clears the input completely, revert to the clean idle guidance state
  if (!query) {
    const resultsContainer = document.getElementById('agent-driver-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = getAgentIdleStateHtml();
    }
  }
}

function clearAgentDriverLookup() {
  const input = document.getElementById('agent-driver-search-input');
  const clearBtn = document.getElementById('agent-driver-clear-btn');
  const resultsContainer = document.getElementById('agent-driver-search-results');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  if (resultsContainer) {
    resultsContainer.innerHTML = getAgentIdleStateHtml();
  }
}

async function executeAgentDriverLookup(isSilentRefresh = false) {
  const input = document.getElementById('agent-driver-search-input');
  const clearBtn = document.getElementById('agent-driver-clear-btn');
  const resultsContainer = document.getElementById('agent-driver-search-results');
  const btn = document.getElementById('btn-driver-verify');
  if (!input || !resultsContainer) return;

  const query = (input.value || '').trim();

  if (clearBtn) {
    if (query) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  if (!query) {
    if (!isSilentRefresh) {
      toast('Please enter a driver mobile number (e.g. 0771234567) or vehicle plate (e.g. WP CAB-1234)', 'warning');
      input.focus();
    }
    return;
  }

  // Exact full match validation
  const phoneDigits = query.replace(/\D/g, '');
  const cleanPlate = query.replace(/[^a-zA-Z0-9]/g, '');
  const isNumericQuery = /^[\d\s\+\-\(\)]+$/.test(query);

  if (isNumericQuery) {
    // Phone query must have at least 9-10 digits (e.g. 0771234567 or 771234567)
    if (phoneDigits.length < 9) {
      if (!isSilentRefresh) {
        toast(`Please enter the complete 10-digit mobile number (e.g. 0771234567). Partial input "${query}" is not permitted.`, 'warning');
        input.focus();
      }
      return;
    }
  } else {
    // Alphanumeric vehicle plate must be at least 4 characters (e.g. WP-5678, CAB-1234)
    if (cleanPlate.length < 4) {
      if (!isSilentRefresh) {
        toast(`Please enter the full vehicle registration plate (e.g. CAB-1234 or WP-5678). At least 4 characters required.`, 'warning');
        input.focus();
      }
      return;
    }
  }

  if (btn && !isSilentRefresh) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" style="display:inline-block;width:15px;height:15px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;margin-right:6px;"></span> Searching...';
  }

  if (!isSilentRefresh) {
    resultsContainer.innerHTML = `
      <div style="padding:32px 20px;text-align:center;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:16px;margin:12px 0;">
        <div class="spin" style="display:inline-block;width:26px;height:26px;border:2.5px solid #059669;border-top-color:transparent;border-radius:50%;margin-bottom:12px;"></div>
        <div style="font-weight:700;font-size:14.5px;color:#0F172A;">Verifying driver across island-wide registry...</div>
        <div style="font-size:12.5px;color:#64748B;margin-top:4px;">Checking exact match for: <strong>${escapeHtml(query)}</strong></div>
      </div>
    `;
  }

  try {
    const res = await agentApiRequest('/api/admin/taxi/vehicles/lookup?query=' + encodeURIComponent(query));
    if (!res.ok) {
      resultsContainer.innerHTML = `
        <div style="padding:16px 20px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:14px;color:#991B1B;font-size:13.5px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;">
          <span>${escapeHtml(res.data?.message || 'Failed to search driver or vehicle.')}</span>
          <button type="button" class="btn-secondary" style="padding:5px 12px;font-size:12px;" onclick="clearAgentDriverLookup()">Reset</button>
        </div>
      `;
      return;
    }

    const vehicles = res.data?.data || [];
    renderAgentDriverLookupResults(vehicles, query);

    // Merge into local list so stats & fleet table sync
    if (vehicles.length > 0) {
      const existingIds = new Set(agentVehicles.map(v => v.id));
      let hasNew = false;
      for (const sv of vehicles) {
        if (!existingIds.has(sv.id)) {
          agentVehicles.unshift(sv);
          existingIds.add(sv.id);
          hasNew = true;
        } else {
          const idx = agentVehicles.findIndex(v => v.id === sv.id);
          if (idx !== -1) agentVehicles[idx] = sv;
          hasNew = true;
        }
      }
      if (hasNew) {
        updateAgentStats(agentVehicles);
        renderAgentFleetTable(agentVehicles);
      }
    }
  } catch (err) {
    console.error('Agent driver lookup error:', err);
    resultsContainer.innerHTML = `
      <div style="padding:16px 20px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:14px;color:#991B1B;font-size:13.5px;margin:12px 0;">
        Error connecting to server: ${escapeHtml(err.message)}
      </div>
    `;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> <span>Find Driver</span>';
    }
  }
}

function renderAgentDriverLookupResults(vehicles, query) {
  const container = document.getElementById('agent-driver-search-results');
  if (!container) return;

  if (!vehicles || vehicles.length === 0) {
    container.innerHTML = `
      <div style="padding:36px 20px;background:#FFFFFF;border:1.5px dashed #CBD5E1;border-radius:16px;text-align:center;max-width:580px;margin:16px auto;">
        <div style="width:48px;height:48px;border-radius:50%;background:#F1F5F9;display:flex;align-items:center;justify-content:center;margin:0 auto 12px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div style="font-weight:800;font-size:15px;color:#0F172A;">No Driver Found for "${escapeHtml(query)}"</div>
        <p style="font-size:13px;color:#64748B;margin:8px 0 16px 0;line-height:1.5;">
          No driver or vehicle was matched in the registry.<br/>
          Make sure you entered the <strong>complete 10-digit mobile number</strong> (e.g. 0771234567) or <strong>exact vehicle plate</strong> (e.g. WP CAB-1234).
        </p>
        <button type="button" class="btn-secondary" style="padding:6px 14px;font-size:12px;" onclick="clearAgentDriverLookup()">Clear & Try Again</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Found ${vehicles.length} Matching Registered Driver${vehicles.length > 1 ? 's' : ''} (Island-wide)
      </span>
      <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:11.5px;" onclick="clearAgentDriverLookup()">Reset Search</button>
    </div>
    ${vehicles.map(v => {
      const driverName = v.driver?.name || 'Regional Driver';
      const phone = v.driver?.phoneNumber || v.mobileNum || 'No phone';
      const status = (v.approvalStatus || 'pending').toLowerCase();
      const isApproved = status === 'approved';
      const isRejected = status === 'rejected';
      const plate = v.vehicleRegNum || '—';
      const typeDisplay = v.vehicleType?.type || 'Taxi';
      const colorDisplay = v.color || '';
      const auditNote = v.approvedBy ? `Approved by: <strong>${escapeHtml(v.approvedBy)}</strong>${v.approvedAt ? ` on ${new Date(v.approvedAt).toLocaleDateString()}` : ''}` : (isRejected ? `Rejected: <strong>${escapeHtml(v.approvalReason || 'Unspecified')}</strong>` : 'Pending Agent Verification');

      const statusBadgeBg = isApproved ? '#ECFDF5' : (isRejected ? '#FEF2F2' : '#FFFBEB');
      const statusBadgeColor = isApproved ? '#059669' : (isRejected ? '#DC2626' : '#D97706');
      const statusBorder = isApproved ? '#A7F3D0' : (isRejected ? '#FCA5A5' : '#FDE68A');

      return `
        <div class="agent-lookup-result-card" id="agent-card-vehicle-${v.id}">
          <div class="agent-result-driver-meta">
            <div class="driver-avatar" style="width:48px;height:48px;font-size:19px;background:#059669;color:#FFF;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 4px 12px rgba(5,150,105,0.25);">
              ${driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-size:16px;font-weight:800;color:#0F172A;">${escapeHtml(driverName)}</span>
                <span class="agent-plate-badge">${escapeHtml(plate)}</span>
                <span style="font-size:11.5px;padding:3px 9px;border-radius:6px;font-weight:800;background:${statusBadgeBg};color:${statusBadgeColor};border:1px solid ${statusBorder};">
                  ${status.toUpperCase()}
                </span>
              </div>
              <div style="font-size:12.5px;color:#64748B;margin-top:6px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <span><strong>Phone:</strong> <a href="tel:${phone}" style="color:#2563EB;text-decoration:none;font-weight:700;">${phone}</a></span>
                <span><strong>Vehicle:</strong> ${escapeHtml(typeDisplay)}${colorDisplay ? ` (${escapeHtml(colorDisplay)})` : ''}</span>
                <span><strong>Base:</strong> ${escapeHtml(v.baseAddress || 'Sri Lanka')}</span>
              </div>
              <div style="font-size:11.5px;color:${isApproved ? '#059669' : (isRejected ? '#DC2626' : '#D97706')};margin-top:5px;font-weight:600;">
                ${auditNote}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-secondary" style="padding:9px 15px;font-size:12.5px;border-radius:10px;" onclick="openDriverDetailsModal('${v.id}')">
              View Documents
            </button>
            ${!isApproved ? `
              <button type="button" class="btn-agent-quick-approve" id="btn-agent-quick-app-${v.id}" onclick="handleAgentQuickApproveVehicle('${v.id}', '${plate.replace(/'/g, "\\'")}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Approve Vehicle Now</span>
              </button>
            ` : `
              <span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:#059669;background:#ECFDF5;padding:8px 16px;border-radius:10px;border:1.5px solid #A7F3D0;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Verified & Approved
              </span>
            `}
            ${!isRejected ? `
              <button type="button" class="btn-secondary" style="padding:9px 12px;font-size:12px;border-radius:10px;color:#DC2626;border-color:#FCA5A5;" onclick="openRejectActionModal('${v.id}', '${driverName.replace(/'/g, "\\'")}', '${plate.replace(/'/g, "\\'")}')">
                Reject
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

async function handleAgentQuickApproveVehicle(vehicleId, regNum) {
  const btn = document.getElementById(`btn-agent-quick-app-${vehicleId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;margin-right:6px;"></span> Approving...';
  }

  try {
    const res = await agentApiRequest('/api/admin/taxi/vehicles/quick-approve', 'POST', { vehicleId });
    if (res.ok && res.data?.success) {
      toast(`Vehicle ${regNum} approved successfully! Driver is now activated.`, 'success');
      await loadAgentVehicles();
      // Silently refresh current lookup result so card shows 'Verified & Approved'
      executeAgentDriverLookup(true);
    } else {
      toast(`Failed to approve: ${res.data?.message || 'Server error'}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>Approve Vehicle Now</span>';
      }
    }
  } catch (err) {
    console.error('Agent quick approve error:', err);
    toast(`Approval failed: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>Approve Vehicle Now</span>';
    }
  }
}

// Window bindings
window.handleAgentDriverSearchInput = handleAgentDriverSearchInput;
window.executeAgentDriverLookup = executeAgentDriverLookup;
window.clearAgentDriverLookup = clearAgentDriverLookup;
window.handleAgentQuickApproveVehicle = handleAgentQuickApproveVehicle;
// Legacy compatibility
window.handleAgentQuickLookup = executeAgentDriverLookup;
window.clearAgentQuickLookup = clearAgentDriverLookup;


/* ================= ROSTER FLEET TABLE ================= */
function renderAgentFleetTable(vehicles) {
  const tbody = document.getElementById('agent-fleet-table-body');
  if (!tbody) return;

  if (vehicles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No drivers registered in your region yet</td></tr>';
    return;
  }

  tbody.innerHTML = vehicles.map((v, i) => {
    const driverName = v.driver?.name || 'Driver';
    const status = v.approvalStatus || 'pending';
    const auditText = v.approvedBy ? `By ${v.approvedBy}` : 'Pending Review';

    return `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>
          <div style="font-weight:700;color:#0F172A;">${driverName}</div>
          <div style="font-size:11px;color:#64748B;"><a href="tel:${v.driver?.phoneNumber || v.mobileNum}" style="color:#2563EB;text-decoration:none;">${v.driver?.phoneNumber || v.mobileNum || '—'}</a></div>
        </td>
        <td>${v.vehicleType?.type || 'Taxi'} <span style="font-size:11px;color:#94A3B8;">(${v.vehicleType?.category || 'Standard'})</span></td>
        <td><code>${v.vehicleRegNum || '—'}</code></td>
        <td>
          <span class="badge-${status}">
            ${status.toUpperCase()}
          </span>
        </td>
        <td>${v.baseAddress || 'Sri Lanka'}</td>
        <td>
          <div style="font-size:11px;color:${status==='approved'?'#059669':'#D97706'};font-weight:600;">${auditText}</div>
          ${v.approvedAt ? `<div style="font-size:10px;color:#94A3B8;">${new Date(v.approvedAt).toLocaleDateString()}</div>` : ''}
        </td>
        <td>
          <button type="button" class="btn-secondary" style="padding:6px 12px;font-size:11px;" onclick="openDriverDetailsModal('${v.id}')">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function setAgentFilter(filter) {
  currentFilter = filter;
  ['all', 'pending', 'approved', 'rejected'].forEach(f => {
    const el = document.getElementById(`pill-filter-${f}`);
    if (el) {
      if (f === filter) el.classList.add('active');
      else el.classList.remove('active');
    }
  });
  handleFleetTableSearch();
}
window.setAgentFilter = setAgentFilter;

function handleFleetTableSearch() {
  const query = (document.getElementById('fleet-search-input')?.value || '').trim().toLowerCase();
  const cleanQuery = query.replace(/[^a-z0-9]/g, '');
  const queryDigits = query.replace(/\D/g, '');

  let filtered = agentVehicles;

  // 1. Filter by status pill (if not 'all')
  if (currentFilter && currentFilter !== 'all') {
    filtered = filtered.filter(v => (v.approvalStatus || 'pending').toLowerCase() === currentFilter);
  }

  // 2. Filter by search query (if present)
  if (query) {
    filtered = filtered.filter(v => {
      const plate = (v.vehicleRegNum || '').toLowerCase();
      const cleanPlate = plate.replace(/[^a-z0-9]/g, '');
      const phone = (v.driver?.phoneNumber || v.mobileNum || '').toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');
      const name = (v.driver?.name || '').toLowerCase();
      const addr = (v.baseAddress || '').toLowerCase();
      const email = (v.driver?.email || '').toLowerCase();

      const plateMatches = plate.includes(query) || (cleanQuery.length >= 2 && cleanPlate.includes(cleanQuery));
      const phoneMatches = phone.includes(query) || (queryDigits.length >= 4 && (phoneDigits.includes(queryDigits) || queryDigits.includes(phoneDigits)));

      return plateMatches || phoneMatches || name.includes(query) || addr.includes(query) || email.includes(query);
    });
  }

  renderAgentFleetTable(filtered);
}

// Global Escape Key Dismissal for Agent Modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDriverDetailsModal();
    closeActionModal();
    if (typeof closeInAppCamera === 'function') closeInAppCamera();
  }
});

/* ================= DRIVER DETAILS & DOCUMENTS MODAL ================= */
function openDriverDetailsModal(vehicleId) {
  const vehicle = agentVehicles.find(v => v.id === vehicleId);
  if (!vehicle) {
    toast('Driver record not found', 'error');
    return;
  }

  const modal = document.getElementById('driver-details-modal');
  const body = document.getElementById('driver-details-modal-body');
  const footer = document.getElementById('driver-details-modal-footer');
  if (!modal || !body) return;

  const driverName = vehicle.driver?.name || 'Regional Driver';
  const phone = vehicle.driver?.phoneNumber || vehicle.mobileNum || 'Not provided';
  const email = vehicle.driver?.email || vehicle.email || 'Not provided';
  const status = vehicle.approvalStatus || 'pending';

  // Gather documents (check both vehicle.documents array or direct document properties)
  const docs = vehicle.documents || [];
  const nicFront = vehicle.nicFrontUrl || docs.find(d => d.type === 'nic_front')?.url || '';
  const nicBack = vehicle.nicBackUrl || docs.find(d => d.type === 'nic_back')?.url || '';
  const licFront = vehicle.drivingLicenseFrontUrl || vehicle.licenseFrontUrl || docs.find(d => d.type === 'license_front')?.url || '';
  const licBack = vehicle.drivingLicenseBackUrl || vehicle.licenseBackUrl || docs.find(d => d.type === 'license_back')?.url || '';

  const nicNo = vehicle.nicNumber || vehicle.driver?.nicNumber || 'Not specified';
  const licNo = vehicle.drivingLicenseNumber || vehicle.licenseNumber || 'Not specified';

  body.innerHTML = `
    <!-- Top banner -->
    <div class="driver-profile-banner">
      <div class="driver-profile-avatar">${driverName.charAt(0).toUpperCase()}</div>
      <div style="flex:1;">
        <h3 style="font-size:17px;font-weight:800;color:#0F172A;margin-bottom:2px;">${driverName}</h3>
        <p style="font-size:13px;color:#64748B;">Phone: <a href="tel:${phone}" style="color:#2563EB;font-weight:600;">${phone}</a></p>
      </div>
      <div>
        <span class="badge-${status}">${status.toUpperCase()}</span>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">Vehicle Plate Number</div>
        <div class="info-item-val"><code>${vehicle.vehicleRegNum || '—'}</code></div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Vehicle Type & Category</div>
        <div class="info-item-val">${vehicle.vehicleType?.type || 'Taxi'} (${vehicle.vehicleType?.category || 'Standard'})</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Vehicle Color</div>
        <div class="info-item-val">${vehicle.color || 'Yellow'}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Base Location Address</div>
        <div class="info-item-val">${vehicle.baseAddress || 'Sri Lanka'}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">NIC Number</div>
        <div class="info-item-val">${nicNo}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Driving License Number</div>
        <div class="info-item-val">${licNo}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Rate Per KM</div>
        <div class="info-item-val">${vehicle.ratePerKm ? `LKR ${Number(vehicle.ratePerKm).toFixed(2)}` : '<em style="color:#94A3B8;">Standard Rate</em>'}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">Waiting Charge (Per Min)</div>
        <div class="info-item-val" style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span>${vehicle.waitingFare ? `LKR ${Number(vehicle.waitingFare).toFixed(2)}/min` : '<em style="color:#94A3B8;">Not set (LKR 0.00)</em>'}</span>
          <button type="button" class="btn-secondary" style="padding:3px 8px;font-size:11px;" onclick="promptUpdateVehicleWaitingRate('${vehicle.id}', ${vehicle.waitingFare || 0})">Edit</button>
        </div>
      </div>
      <div class="info-item" style="grid-column: 1/-1;">
        <div class="info-item-label">Waiting Status (Dedicated API)</div>
        <div class="info-item-val" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px;">
          <div>
            <span style="font-weight:700;color:${vehicle.isWaiting ? '#059669' : '#64748B'};">${vehicle.isWaiting ? 'WAITING ACTIVE (ON)' : 'WAITING INACTIVE (OFF)'}</span>
            ${vehicle.isWaiting && vehicle.waitingStartedAt ? `<div style="font-size:11px;color:#059669;font-weight:500;">Started at: ${new Date(vehicle.waitingStartedAt).toLocaleTimeString()}</div>` : ''}
          </div>
          <button type="button" class="btn-secondary" style="padding:4px 12px;font-size:11px;font-weight:700;border-radius:6px;background:${vehicle.isWaiting ? '#FEE2E2' : '#DCFCE7'};color:${vehicle.isWaiting ? '#B91C1C' : '#15803D'};border-color:transparent;" onclick="toggleVehicleWaitingMode('${vehicle.id}')">
            ${vehicle.isWaiting ? 'Turn OFF Waiting' : 'Turn ON Waiting'}
          </button>
        </div>
      </div>
      <div class="info-item" style="grid-column: 1/-1;">
        <div class="info-item-label">Driver Email</div>
        <div class="info-item-val">${email}</div>
      </div>
    </div>

    <!-- Verification Documents Section -->
    <div>
      <div class="doc-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        Verification Documents (Camera Snap or Upload to update)
      </div>
      <div class="doc-thumbnails-grid">
        ${renderDocThumb('NIC Front', nicFront, vehicle.id, 'nicFrontUrl')}
        ${renderDocThumb('NIC Back', nicBack, vehicle.id, 'nicBackUrl')}
        ${renderDocThumb('License Front', licFront, vehicle.id, 'licenseFrontUrl')}
        ${renderDocThumb('License Back', licBack, vehicle.id, 'licenseBackUrl')}
      </div>
    </div>

    <!-- Audit history -->
    ${vehicle.approvedBy ? `
      <div class="audit-stamp" style="margin-bottom:0;">
        <strong>Audit Trail:</strong><br/>
        Status: <span style="color:${status==='approved'?'#059669':'#EF4444'};font-weight:700;">${status.toUpperCase()}</span><br/>
        Recorded By: <strong>${vehicle.approvedBy}</strong>
        ${vehicle.approvedAt ? `<br/>Timestamp: ${new Date(vehicle.approvedAt).toLocaleString()}` : ''}
        ${vehicle.approvalReason ? `<br/>Notes: "${vehicle.approvalReason}"` : ''}
      </div>
    ` : ''}
  `;

  // Action buttons
  footer.innerHTML = `
    <button type="button" class="btn-secondary" onclick="closeDriverDetailsModal()">Close</button>
    ${status !== 'approved' ? `
      <button type="button" class="btn-primary" onclick="closeDriverDetailsModal(); openApproveActionModal('${vehicle.id}', '${driverName.replace(/'/g, "\\'")}', '${(vehicle.vehicleRegNum||'').replace(/'/g, "\\'")}')">
        Approve Driver
      </button>
    ` : ''}
    ${status !== 'rejected' ? `
      <button type="button" class="btn-reject" style="max-width:130px;" onclick="closeDriverDetailsModal(); openRejectActionModal('${vehicle.id}', '${driverName.replace(/'/g, "\\'")}', '${(vehicle.vehicleRegNum||'').replace(/'/g, "\\'")}')">
        Reject
      </button>
    ` : ''}
  `;

  modal.classList.add('active');
}

function renderDocThumb(label, url, vehicleId, docKey) {
  const hasUrl = url && (url.startsWith('http') || url.startsWith('/uploads'));
  const fullUrl = hasUrl ? (url.startsWith('http') ? url : `${API_BASE}${url}`) : '';

  return `
    <div class="doc-thumb-card">
      ${hasUrl ? `
        <img src="${fullUrl}" alt="${label}" class="doc-thumb-img" onclick="openLightbox('${fullUrl}')" title="Click to view full image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 24 24\\'%3E%3Ctext y=\\'20\\' font-size=\\'14\\'%3EImage error%3C/text%3E%3C/svg%3E';" />
        <div class="doc-thumb-label" onclick="openLightbox('${fullUrl}')">${label}</div>
      ` : `
        <div class="doc-thumb-empty" onclick="triggerModalDocSnap('${vehicleId}', '${docKey}', 'camera')">Not uploaded</div>
        <div class="doc-thumb-label">${label}</div>
      `}
      <div class="modal-doc-actions" onclick="event.stopPropagation()">
        <button type="button" class="btn-modal-snap" onclick="triggerModalDocSnap('${vehicleId}', '${docKey}', 'camera')" title="Take live photo with camera">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          ${hasUrl ? 'Retake' : 'Camera'}
        </button>
        <button type="button" class="btn-modal-gallery" onclick="triggerModalDocSnap('${vehicleId}', '${docKey}', 'gallery')" title="Upload image file">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          Upload
        </button>
      </div>
    </div>
  `;
}

function closeDriverDetailsModal() {
  document.getElementById('driver-details-modal')?.classList.remove('active');
}

/* ================= WAITING STATUS & RATES (DEDICATED API) ================= */
async function toggleVehicleWaitingMode(vehicleId) {
  try {
    const res = await agentApiRequest(`/api/admin/taxi/vehicles/${vehicleId}/waiting`, 'PATCH', {
      toggle: true
    });
    if (res.ok) {
      const isWaitingNow = res.data?.data?.isWaiting;
      toast(`Vehicle waiting mode turned ${isWaitingNow ? 'ON' : 'OFF'}`, 'success');
      await loadAgentVehicles();
      openDriverDetailsModal(vehicleId);
    } else {
      toast(res.data?.message || 'Failed to toggle waiting status', 'error');
    }
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

async function promptUpdateVehicleWaitingRate(vehicleId, currentFare) {
  const newRate = prompt('Enter Waiting Charge (LKR per minute):', currentFare || '10');
  if (newRate === null) return;
  const numRate = parseFloat(newRate);
  if (isNaN(numRate) || numRate < 0) {
    toast('Please enter a valid positive number for waiting charge', 'warning');
    return;
  }
  try {
    const res = await agentApiRequest(`/api/admin/taxi/vehicles/${vehicleId}/waiting`, 'PATCH', {
      waitingFare: numRate
    });
    if (res.ok) {
      toast(`Waiting charge updated to LKR ${numRate.toFixed(2)}/min`, 'success');
      await loadAgentVehicles();
      openDriverDetailsModal(vehicleId);
    } else {
      toast(res.data?.message || 'Failed to update waiting charge', 'error');
    }
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

/* ================= DOCUMENT LIGHTBOX ================= */
function openLightbox(imgUrl) {
  const box = document.getElementById('image-lightbox-modal');
  const img = document.getElementById('lightbox-img');
  if (box && img) {
    img.src = imgUrl;
    box.classList.add('active');
  }
}

function closeLightbox() {
  const box = document.getElementById('image-lightbox-modal');
  if (box) box.classList.remove('active');
}

/* ================= MODERN IN-APP CONFIRMATION MODAL ================= */
function openApproveActionModal(vehicleId, driverName, plateNum) {
  pendingAction = { type: 'approve', vehicleId, driverName, plateNum };
  const modal = document.getElementById('agent-action-modal');
  const title = document.getElementById('action-modal-title');
  const summary = document.getElementById('action-modal-summary');
  const noteLabel = document.getElementById('action-modal-note-label');
  const noteInput = document.getElementById('action-modal-note');
  const confirmBtn = document.getElementById('action-modal-confirm-btn');

  if (title) title.textContent = 'Approve Driver';
  if (summary) {
    summary.innerHTML = `Are you sure you want to approve driver <strong>${driverName}</strong> with vehicle plate <code>${plateNum}</code> for regional taxi dispatch?`;
  }
  if (noteLabel) noteLabel.textContent = 'Approval Comments (Optional):';
  if (noteInput) noteInput.value = 'Verified and approved by Regional Agent';
  if (confirmBtn) {
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = 'Confirm Approval';
  }

  modal.classList.add('active');
  noteInput?.focus();
}

function openRejectActionModal(vehicleId, driverName, plateNum) {
  pendingAction = { type: 'reject', vehicleId, driverName, plateNum };
  const modal = document.getElementById('agent-action-modal');
  const title = document.getElementById('action-modal-title');
  const summary = document.getElementById('action-modal-summary');
  const noteLabel = document.getElementById('action-modal-note-label');
  const noteInput = document.getElementById('action-modal-note');
  const confirmBtn = document.getElementById('action-modal-confirm-btn');

  if (title) title.textContent = 'Reject Driver';
  if (summary) {
    summary.innerHTML = `Are you sure you want to reject driver <strong>${driverName}</strong> (${plateNum}) registration?`;
  }
  if (noteLabel) noteLabel.textContent = 'Rejection Reason (Required):';
  if (noteInput) {
    noteInput.value = '';
    noteInput.placeholder = 'e.g. Documents unclear or invalid license';
  }
  if (confirmBtn) {
    confirmBtn.className = 'btn-reject';
    confirmBtn.textContent = 'Confirm Rejection';
  }

  modal.classList.add('active');
  noteInput?.focus();
}

function closeActionModal() {
  document.getElementById('agent-action-modal')?.classList.remove('active');
  pendingAction = null;
}

async function executeAgentAction() {
  if (!pendingAction) return;
  const { type, vehicleId, driverName, plateNum } = pendingAction;
  const noteInput = document.getElementById('action-modal-note');
  const note = (noteInput?.value || '').trim();

  if (type === 'reject' && !note) {
    toast('Please provide a reason for rejecting this driver', 'warning');
    noteInput?.focus();
    return;
  }

  const confirmBtn = document.getElementById('action-modal-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
  }

  try {
    const endpoint = `/api/admin/taxi/vehicles/${vehicleId}/${type}`;
    const payload = { reason: note || (type === 'approve' ? 'Approved by Regional Agent' : 'Documents incomplete') };
    const res = await agentApiRequest(endpoint, 'PATCH', payload);

    if (res.ok) {
      toast(`Driver ${driverName} (${plateNum}) ${type === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
      closeActionModal();
      await loadAgentVehicles();
      const currentQuery = document.getElementById('agent-driver-search-input')?.value.trim();
      if (currentQuery) {
        executeAgentDriverLookup(true);
      }
    } else {
      toast(res.data?.message || `Failed to ${type} driver`, 'error');
    }
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }
  }
}

/* ================= INLINE DRIVER REGISTRATION ================= */
let regPanelOpen = false;

function toggleRegisterPanel() {
  const panel = document.getElementById('register-driver-panel');
  const btn = document.getElementById('btn-open-register-driver');
  const label = document.getElementById('reg-btn-label');
  const icon = document.getElementById('reg-btn-icon');

  regPanelOpen = !regPanelOpen;

  if (regPanelOpen) {
    panel.classList.remove('collapsed');
    panel.classList.add('expanded');
    btn.classList.add('panel-open');
    if (label) label.textContent = 'Close Registration';
    if (icon) icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    loadVehicleTypes();
  } else {
    panel.classList.remove('expanded');
    panel.classList.add('collapsed');
    btn.classList.remove('panel-open');
    if (label) label.textContent = 'Register New Driver';
    if (icon) icon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
  }
}

async function handleAgentRegisterDriver(e) {
  e.preventDefault();
  const name = document.getElementById('reg-driver-name')?.value?.trim() || '';
  const phone = document.getElementById('reg-driver-phone')?.value?.trim() || '';
  const email = document.getElementById('reg-driver-email')?.value?.trim() || '';
  const typeId = document.getElementById('reg-vehicle-type')?.value || '';
  const plate = document.getElementById('reg-vehicle-plate')?.value?.trim() || '';
  const color = document.getElementById('reg-vehicle-color')?.value?.trim() || '';
  const baseAddr = document.getElementById('reg-base-address')?.value?.trim() || '';
  const nicNo = document.getElementById('reg-nic-number')?.value?.trim() || '';
  const licenseNo = document.getElementById('reg-license-number')?.value?.trim() || '';
  const waitingFare = document.getElementById('reg-waiting-fare')?.value?.trim() || '';
  const rateKm = document.getElementById('reg-rate-per-km')?.value?.trim() || '';
  const nicFront = document.getElementById('reg-nic-front')?.value?.trim() || '';
  const nicBack = document.getElementById('reg-nic-back')?.value?.trim() || '';
  const licenseFront = document.getElementById('reg-license-front')?.value?.trim() || '';
  const licenseBack = document.getElementById('reg-license-back')?.value?.trim() || '';

  if (!name || !phone || !plate) {
    toast('Please fill required fields: Driver Name, Phone Number, and Plate Number (*)', 'warning');
    return;
  }

  const btn = document.getElementById('btn-submit-reg');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Registering & Approving...';
  }

  try {
    const res = await agentApiRequest('/api/admin/taxi/vehicles/register', 'POST', {
      driverName: name,
      mobileNum: phone,
      email: email || undefined,
      vehicleTypeId: typeId || '290f259b-1e8d-416e-8599-ee377e135b6d',
      vehicleRegNum: plate,
      color,
      baseAddress: baseAddr,
      nicNumber: nicNo || undefined,
      drivingLicenseNumber: licenseNo || undefined,
      waitingFare: waitingFare !== '' ? parseFloat(waitingFare) : undefined,
      ratePerKm: rateKm !== '' ? parseFloat(rateKm) : undefined,
      nicFrontUrl: nicFront || undefined,
      nicBackUrl: nicBack || undefined,
      drivingLicenseFrontUrl: licenseFront || undefined,
      drivingLicenseBackUrl: licenseBack || undefined
    });

    if (res.ok) {
      toast(`Driver ${name} (${plate}) registered & approved!`, 'success');
      if (regPanelOpen) toggleRegisterPanel();
      const form = document.getElementById('register-driver-form');
      if (form) form.reset();
      // Reset document upload preview cards
      ['nic-front', 'nic-back', 'license-front', 'license-back'].forEach(k => {
        removeDocUpload(`reg-${k}`, `preview-${k}`, `status-${k}`, `camera-${k}`);
      });
      await loadAgentVehicles();
      switchAgentTab('agent-fleet');
    } else {
      toast(res.data?.message || 'Failed to register driver', 'error');
    }
  } catch (err) {
    toast('Error registering driver: ' + (err.message || 'Server network error'), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Register & Approve Driver';
    }
  }
}

/* ================= DOCUMENT UPLOAD & CAMERA SYSTEM ================= */

/**
 * Compresses an image client-side before uploading (down to max 1280px).
 * Essential for fast mobile uploads from smartphone cameras.
 */
function compressImage(file, maxWidth = 1280, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a document file to backend POST /api/admin/taxi/upload-document
 */
async function uploadDocumentFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  if (agentToken) {
    headers['Authorization'] = `Bearer ${agentToken}`;
  }

  const response = await fetch(`${API_BASE}/api/admin/taxi/upload-document`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

function triggerDocCamera(inputId) {
  let hiddenId = '';
  let previewId = '';
  let statusId = '';
  let title = 'Scan Document';

  if (inputId.includes('nic-front')) {
    hiddenId = 'reg-nic-front';
    previewId = 'preview-nic-front';
    statusId = 'status-nic-front';
    title = 'Scan NIC Front Photo';
  } else if (inputId.includes('nic-back')) {
    hiddenId = 'reg-nic-back';
    previewId = 'preview-nic-back';
    statusId = 'status-nic-back';
    title = 'Scan NIC Back Photo';
  } else if (inputId.includes('license-front')) {
    hiddenId = 'reg-license-front';
    previewId = 'preview-license-front';
    statusId = 'status-license-front';
    title = 'Scan License Front Photo';
  } else if (inputId.includes('license-back')) {
    hiddenId = 'reg-license-back';
    previewId = 'preview-license-back';
    statusId = 'status-license-back';
    title = 'Scan License Back Photo';
  }

  openLiveCamera({
    type: 'register',
    inputId,
    hiddenId,
    previewId,
    statusId,
    title
  });
}

function triggerDocFile(inputId) {
  document.getElementById(inputId)?.click();
}

/* ================= IN-APP LIVE CAMERA VIEWFINDER SYSTEM ================= */

async function openLiveCamera(config) {
  activeCameraConfig = config;
  capturedSnapshotBlob = null;

  const modal = document.getElementById('live-camera-modal');
  const titleEl = document.getElementById('camera-modal-doc-title');
  const videoEl = document.getElementById('camera-video-stream');
  const previewImg = document.getElementById('camera-snapshot-preview');
  const controlsBar = document.getElementById('camera-controls-bar');
  const reviewBar = document.getElementById('camera-review-bar');
  const loadingOverlay = document.getElementById('camera-loading-overlay');
  const docFrame = document.getElementById('camera-doc-frame');

  if (titleEl) titleEl.textContent = config.title || 'Scan Document';
  if (videoEl) videoEl.style.display = 'block';
  if (previewImg) previewImg.style.display = 'none';
  if (docFrame) docFrame.style.display = 'flex';
  if (controlsBar) controlsBar.style.display = 'flex';
  if (reviewBar) reviewBar.style.display = 'none';
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');

  modal?.classList.add('active');

  // If getUserMedia is not supported, fallback cleanly
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    closeLiveCamera();
    toast('Live camera stream not supported by browser. Opening camera file picker...', 'info');
    triggerDocCameraFallback();
    return;
  }

  await startLiveCameraStream();
}

async function startLiveCameraStream() {
  const videoEl = document.getElementById('camera-video-stream');
  const loadingOverlay = document.getElementById('camera-loading-overlay');

  stopLiveCameraStream();

  try {
    const constraints = {
      video: {
        facingMode: { ideal: currentCameraFacing },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeCameraStream = stream;

    if (videoEl) {
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      await videoEl.play();
    }

    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  } catch (err) {
    console.warn('Camera stream with facingMode failed, trying basic video:', err);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      activeCameraStream = stream;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        await videoEl.play();
      }
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    } catch (fallbackErr) {
      console.error('Failed to access live camera:', fallbackErr);
      closeLiveCamera();
      toast('Camera permission denied or camera unavailable. Opening file/camera picker...', 'warning');
      triggerDocCameraFallback();
    }
  }
}

function stopLiveCameraStream() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach(track => {
      try { track.stop(); } catch {}
    });
    activeCameraStream = null;
  }
}

function closeLiveCamera() {
  stopLiveCameraStream();
  document.getElementById('live-camera-modal')?.classList.remove('active');
  activeCameraConfig = null;
  capturedSnapshotBlob = null;
}

async function switchCameraFacing() {
  currentCameraFacing = currentCameraFacing === 'environment' ? 'user' : 'environment';
  const loadingOverlay = document.getElementById('camera-loading-overlay');
  if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  await startLiveCameraStream();
}

function captureLiveSnapshot() {
  const videoEl = document.getElementById('camera-video-stream');
  const canvas = document.getElementById('camera-capture-canvas');
  const previewImg = document.getElementById('camera-snapshot-preview');
  const controlsBar = document.getElementById('camera-controls-bar');
  const reviewBar = document.getElementById('camera-review-bar');
  const docFrame = document.getElementById('camera-doc-frame');

  if (!videoEl || !canvas || !videoEl.videoWidth) {
    toast('Camera feed not ready yet. Please wait a moment.', 'warning');
    return;
  }

  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      toast('Failed to capture snapshot', 'error');
      return;
    }
    capturedSnapshotBlob = blob;
    const previewUrl = URL.createObjectURL(blob);

    if (previewImg) {
      previewImg.src = previewUrl;
      previewImg.style.display = 'block';
    }
    if (videoEl) videoEl.style.display = 'none';
    if (docFrame) docFrame.style.display = 'none';
    if (controlsBar) controlsBar.style.display = 'none';
    if (reviewBar) reviewBar.style.display = 'flex';
  }, 'image/jpeg', 0.88);
}

function retakeLiveSnapshot() {
  capturedSnapshotBlob = null;
  const videoEl = document.getElementById('camera-video-stream');
  const previewImg = document.getElementById('camera-snapshot-preview');
  const controlsBar = document.getElementById('camera-controls-bar');
  const reviewBar = document.getElementById('camera-review-bar');
  const docFrame = document.getElementById('camera-doc-frame');

  if (previewImg) previewImg.style.display = 'none';
  if (videoEl) videoEl.style.display = 'block';
  if (docFrame) docFrame.style.display = 'flex';
  if (controlsBar) controlsBar.style.display = 'flex';
  if (reviewBar) reviewBar.style.display = 'none';
}

async function confirmLiveSnapshot() {
  if (!capturedSnapshotBlob || !activeCameraConfig) {
    closeLiveCamera();
    return;
  }

  const config = activeCameraConfig;
  const blob = capturedSnapshotBlob;
  const file = new File([blob], `cam-${Date.now()}.jpg`, { type: 'image/jpeg' });

  closeLiveCamera();

  if (config.type === 'register') {
    await processRegisterDocUpload(file, config.hiddenId, config.previewId, config.statusId, config.inputId);
  } else if (config.type === 'modal') {
    await processModalDocUpload(file, config.vehicleId, config.docKey);
  }
}

function fallbackToGalleryFromCamera() {
  const config = activeCameraConfig;
  closeLiveCamera();
  if (!config) return;

  if (config.type === 'register') {
    const fileInputId = config.inputId ? config.inputId.replace('camera-', 'file-') : null;
    if (fileInputId) document.getElementById(fileInputId)?.click();
  } else if (config.type === 'modal') {
    activeModalDocUpload = { vehicleId: config.vehicleId, docKey: config.docKey };
    document.getElementById('modal-doc-gallery')?.click();
  }
}

function triggerDocCameraFallback() {
  if (!activeCameraConfig) return;
  if (activeCameraConfig.type === 'register') {
    document.getElementById(activeCameraConfig.inputId)?.click();
  } else if (activeCameraConfig.type === 'modal') {
    activeModalDocUpload = { vehicleId: activeCameraConfig.vehicleId, docKey: activeCameraConfig.docKey };
    document.getElementById('modal-doc-camera')?.click();
  }
}

/**
 * Handles file selected from camera or gallery on registration form
 */
async function handleDocFileInput(inputEl, hiddenId, previewId, statusId) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  await processRegisterDocUpload(file, hiddenId, previewId, statusId, inputEl.id);
  inputEl.value = '';
}

async function processRegisterDocUpload(file, hiddenId, previewId, statusId, inputId) {
  const statusBadge = document.getElementById(statusId);
  const previewArea = document.getElementById(previewId);
  const hiddenInput = document.getElementById(hiddenId);

  if (statusBadge) {
    statusBadge.className = 'doc-status-badge uploading';
    statusBadge.textContent = 'Uploading...';
  }

  // Instant local preview
  const localUrl = URL.createObjectURL(file);
  if (previewArea) {
    previewArea.outerHTML = `
      <div class="reg-doc-preview-has-img" id="${previewId}">
        <img src="${localUrl}" alt="Preview" />
        <button type="button" class="btn-doc-remove" onclick="removeDocUpload('${hiddenId}', '${previewId}', '${statusId}', '${inputId}')" title="Remove photo">&times;</button>
      </div>
    `;
  }

  try {
    const compressed = await compressImage(file);
    const res = await uploadDocumentFile(compressed);
    if (res.ok && res.data?.url) {
      if (hiddenInput) hiddenInput.value = res.data.url;
      if (statusBadge) {
        statusBadge.className = 'doc-status-badge uploaded';
        statusBadge.textContent = 'Uploaded';
      }
      toast('Document photo uploaded successfully!', 'success');
    } else {
      throw new Error(res.data?.message || 'Upload failed');
    }
  } catch (err) {
    console.error('Doc upload error:', err);
    toast('Failed to upload document: ' + err.message, 'error');
    if (statusBadge) {
      statusBadge.className = 'doc-status-badge';
      statusBadge.textContent = 'Upload Failed';
    }
  }
}

/**
 * Clears an uploaded document from registration form
 */
function removeDocUpload(hiddenId, previewId, statusId, inputId) {
  const hiddenInput = document.getElementById(hiddenId);
  if (hiddenInput) hiddenInput.value = '';

  const input = document.getElementById(inputId);
  if (input) input.value = '';

  const statusBadge = document.getElementById(statusId);
  if (statusBadge) {
    statusBadge.className = 'doc-status-badge';
    statusBadge.textContent = 'Not Added';
  }

  const el = document.getElementById(previewId);
  if (el) {
    const isLicense = hiddenId.includes('license');
    const svgIcon = isLicense
      ? `<rect x="3" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="12" y1="10" x2="20" y2="10"/><line x1="12" y1="14" x2="18" y2="14"/>`
      : `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>`;

    const cameraInputId = inputId && inputId.startsWith('camera') ? inputId : (inputId ? inputId.replace('file-', 'camera-') : 'camera-nic-front');

    el.outerHTML = `
      <div class="reg-doc-preview-empty" id="${previewId}" onclick="triggerDocCamera('${cameraInputId}')">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2">${svgIcon}</svg>
        <span>Tap to Take Photo</span>
      </div>
    `;
  }
}

/* ================= MODAL ON-THE-SPOT DOCUMENT UPLOAD ================= */
let activeModalDocUpload = null; // { vehicleId, docKey }

function triggerModalDocSnap(vehicleId, docKey, mode) {
  let title = 'Scan Document';
  if (docKey.includes('nicFront')) title = 'Scan NIC Front Photo';
  else if (docKey.includes('nicBack')) title = 'Scan NIC Back Photo';
  else if (docKey.includes('licenseFront') || docKey.includes('drivingLicenseFront')) title = 'Scan License Front Photo';
  else if (docKey.includes('licenseBack') || docKey.includes('drivingLicenseBack')) title = 'Scan License Back Photo';

  if (mode === 'camera') {
    openLiveCamera({
      type: 'modal',
      vehicleId,
      docKey,
      title
    });
  } else {
    activeModalDocUpload = { vehicleId, docKey };
    document.getElementById('modal-doc-gallery')?.click();
  }
}

async function handleModalDocFileInput(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file || !activeModalDocUpload) return;

  const { vehicleId, docKey } = activeModalDocUpload;
  inputEl.value = '';
  await processModalDocUpload(file, vehicleId, docKey);
}

async function processModalDocUpload(file, vehicleId, docKey) {
  toast('Uploading document photo...', 'info');

  try {
    const compressed = await compressImage(file);
    const uploadRes = await uploadDocumentFile(compressed);
    if (!uploadRes.ok || !uploadRes.data?.url) {
      throw new Error(uploadRes.data?.message || 'Upload failed');
    }

    const fileUrl = uploadRes.data.url;

    const payload = {};
    if (docKey === 'nicFrontUrl') payload.nicFrontUrl = fileUrl;
    else if (docKey === 'nicBackUrl') payload.nicBackUrl = fileUrl;
    else if (docKey === 'licenseFrontUrl' || docKey === 'drivingLicenseFrontUrl') payload.licenseFrontUrl = fileUrl;
    else if (docKey === 'licenseBackUrl' || docKey === 'drivingLicenseBackUrl') payload.licenseBackUrl = fileUrl;
    else payload[docKey] = fileUrl;

    const patchRes = await agentApiRequest(`/api/admin/taxi/vehicles/${vehicleId}`, 'PATCH', payload);
    if (patchRes.ok) {
      toast('Document photo uploaded & saved successfully!', 'success');
      // Update local vehicle object
      const v = agentVehicles.find(item => item.id === vehicleId);
      if (v) {
        v[docKey] = fileUrl;
        if (docKey === 'licenseFrontUrl') v.drivingLicenseFrontUrl = fileUrl;
        if (docKey === 'licenseBackUrl') v.drivingLicenseBackUrl = fileUrl;
      }
      openDriverDetailsModal(vehicleId);
    } else {
      toast('Uploaded photo, but failed to link: ' + (patchRes.data?.message || ''), 'error');
    }
  } catch (err) {
    console.error('Modal doc upload error:', err);
    toast('Error uploading document: ' + err.message, 'error');
  } finally {
    activeModalDocUpload = null;
  }
}

/* ================= TOAST NOTIFICATIONS ================= */
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  
  const icons = {
    success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  const iconSvg = icons[type] || icons.info;
  t.innerHTML = `<span style="display:inline-flex;align-items:center;flex-shrink:0;">${iconSvg}</span> <span>${msg}</span>`;
  
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

