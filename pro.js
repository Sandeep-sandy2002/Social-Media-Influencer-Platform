const API_BASE_URL = "http://localhost:3000/api"; 
const appContainer = document.getElementById("app-container");
const loginButton = document.getElementById("loginForm");
const logoutButton = document.getElementById("logout-button");
const searchInput = document.getElementById("search-input");
const ADMIN_EMAIL = "noorasandeep6@gmail.com";
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; 
let sessionTimer = null;
let lastActivityAt = null;
let state = {
  currentPage: "home",
  isLoggedIn: false,
  user: null,
  influencers: [],
  campaigns: [],
  message: null,
  selectedInfluencerId: null,
  selectedCampaignId: null,
  searchQuery: "",
  following: [], 
  showInfluencerForm: false,
  showCampaignForm: false,
  editingInfluencer: null,
  editingCampaign: null
};
function setState(newState) {
  state = { ...state, ...newState };
  render();
}
function setMessage(text, type = "success") {
  setState({ message: { text, type } });
  setTimeout(() => setState({ message: null }), 3500);
}
function startSessionTimer() {
  clearSessionTimer();
  lastActivityAt = Date.now();
  sessionTimer = setTimeout(handleSessionTimeout, SESSION_TIMEOUT_MS);
  attachActivityListeners();
}
function resetSessionTimer() {
  if (!state.isLoggedIn) return;
  lastActivityAt = Date.now();
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(handleSessionTimeout, SESSION_TIMEOUT_MS);
}
function clearSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);
  removeActivityListeners();
  sessionTimer = null;
  lastActivityAt = null;
}
function handleSessionTimeout() {
  localStorage.removeItem("connectus_user");
  localStorage.removeItem("connectus_user_login_at");
  setState({ isLoggedIn: false, user: null, following: [], currentPage: "home" });
  clearSessionTimer();
  setMessage("Session expired. You have been logged out due to inactivity.", "error");
}
function onUserActivity() { resetSessionTimer(); }
function attachActivityListeners() {
  window.addEventListener("mousemove", onUserActivity);
  window.addEventListener("keydown", onUserActivity);
  window.addEventListener("click", onUserActivity);
  window.addEventListener("touchstart", onUserActivity);
}
function removeActivityListeners() {
  window.removeEventListener("mousemove", onUserActivity);
  window.removeEventListener("keydown", onUserActivity);
  window.removeEventListener("click", onUserActivity);
  window.removeEventListener("touchstart", onUserActivity);
}
function getFilteredResults() {
  const q = (state.searchQuery || "").trim().toLowerCase();
  if (!q) return { influencers: state.influencers, campaigns: state.campaigns };

  const influencers = state.influencers.filter(i =>
    (i.name || "").toLowerCase().includes(q) ||
    (i.niche || "").toLowerCase().includes(q) ||
    (i.bio || "").toLowerCase().includes(q)
  );

  const campaigns = state.campaigns.filter(c =>
    (c.title || "").toLowerCase().includes(q) ||
    (c.target_niche || "").toLowerCase().includes(q) ||
    (c.description || "").toLowerCase().includes(q)
  );

  return { influencers, campaigns };
}
function isAdminUser() {
  return state.isLoggedIn && state.user && String(state.user.email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
function render() {
  
  if (state.isLoggedIn) {
    loginButton.style.display = "none";
    logoutButton.style.display = "inline-block";
  } else {
    loginButton.style.display = "inline-block";
    logoutButton.style.display = "none";
  }

  if (searchInput && searchInput.value !== state.searchQuery) searchInput.value = state.searchQuery || "";

  let html = renderMessage();

  if (state.selectedInfluencerId) {
    const inf = state.influencers.find(i => i.id === state.selectedInfluencerId);
    html += renderInfluencerDetailPage(inf);
    appContainer.innerHTML = html;
    attachEventListeners();
    return;
  }
  if (state.selectedCampaignId) {
    const camp = state.campaigns.find(c => c.id === state.selectedCampaignId);
    html += renderCampaignDetailPage(camp);
    appContainer.innerHTML = html;
    attachEventListeners();
    return;
  }

  switch (state.currentPage) {
    case "home": html += renderHomepage(); break;
    case "influencers": html += renderInfluencersPage(); break;
    case "campaigns": html += renderCampaignsPage(); break;
    case "login": html += renderLoginPage(); break;
    case "register": html += renderRegisterPage(); break;
    default: html += renderHomepage();
  }

  appContainer.innerHTML = html;
  attachEventListeners();
}

function renderMessage() {
  if (!state.message) return "";
  return `<div class="message-box ${state.message.type === "success" ? "message-success" : "message-error"}">${escapeHtml(state.message.text)}</div>`;
}

function renderHomepage() {
  const { influencers, campaigns } = getFilteredResults();
  return `
    <section style="background:linear-gradient(to right,#3b82f6,#4f46e5);padding:2rem;border-radius:12px;color:white;margin-bottom:1.25rem">
      <h1 style="margin:0 0 .5rem 0">Partner. Create. Grow.</h1>
      <p style="opacity:.95;margin-bottom:0.75rem">Connecting brands with the voices that matter.</p>
      <button class="btn btn-secondary" onclick="setState({ currentPage: 'campaigns' })">Explore Campaigns</button>
    </section>

    <h2>Featured Campaigns</h2>
    <div class="card-grid">${campaigns.slice(0,3).map(renderCampaignCard).join("")}</div>

    <h2 style="margin-top:1rem">Featured Influencers</h2>
    <div class="card-grid">${influencers.slice(0,4).map(renderInfluencerCard).join("")}</div>
  `;
}

function renderInfluencerCard(i) {
  const img = i.image_url || "https://via.placeholder.com/400x300?text=No+Image";
  const admin = isAdminUser();
  const isOwner = state.isLoggedIn && state.user && i.user_id === state.user.id;
  const canEditBackend = !!i.can_edit;
  const canDeleteBackend = !!i.can_delete;
  const canFollowBackend = typeof i.can_follow !== "undefined" ? !!i.can_follow : false;
  const canUnfollowBackend = typeof i.can_unfollow !== "undefined" ? !!i.can_unfollow : false;
  const showEditDelete = admin || isOwner || canEditBackend || canDeleteBackend;
  const fallbackCanFollow = (i.user_id !== (state.user?.id || 0)) && state.isLoggedIn && !state.following.includes(i.id);
  const fallbackCanUnfollow = (i.user_id !== (state.user?.id || 0)) && state.isLoggedIn && state.following.includes(i.id);
  const followVisible = (!admin) && (typeof i.can_follow !== "undefined" ? canFollowBackend : fallbackCanFollow);
  const unfollowVisible = (!admin) && (typeof i.can_unfollow !== "undefined" ? canUnfollowBackend : fallbackCanUnfollow);
  const followBtn = followVisible ? `<button class="btn btn-success" onclick="event.stopPropagation(); followInfluencer(${i.id})">Follow</button>` : "";
  const unfollowBtn = unfollowVisible ? `<button class="btn btn-secondary" onclick="event.stopPropagation(); unfollowInfluencer(${i.id})">Unfollow</button>` : "";
  const editBtn = showEditDelete ? `<button class="btn action-small btn-secondary" onclick="event.stopPropagation(); startEditInfluencer(${i.id})">Edit</button>` : '';
  const deleteBtn = showEditDelete ? `<button class="btn action-small btn-secondary" onclick="event.stopPropagation(); deleteInfluencer(${i.id})">Delete</button>` : '';

  
  const priceBlock = `
    <div style="position:absolute; top:10px; right:10px; text-align:right;">
      <div style="background:rgba(255,255,255,0.98); padding:8px 10px; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,0.06); font-weight:600; line-height:1.25;">
        <div style="font-size:12px;color:#333">Post: ${escapeHtml(i.price_post || "—")}</div>
        <div style="font-size:12px;color:#333">Video: ${escapeHtml(i.price_video || "—")}</div>
        <div style="font-size:12px;color:#333">Promo: ${escapeHtml(i.price_promotion || "—")}</div>
      </div>
    </div>
  `;

  return `
    <div class="card" onclick="setState({ selectedInfluencerId: ${i.id} })" style="position:relative;">
      ${priceBlock}
      <img src="${escapeHtml(img)}" class="profile-img" alt="${escapeHtml(i.name)}" />
      <div class="card-top">
        <div class="card-title">
          <h3 style="margin:0.25rem 0">${escapeHtml(i.name)}</h3>
          <p style="color:var(--muted);margin:0">${escapeHtml(i.niche||'')}</p>
        </div>
      </div>
      <p style="margin-top:0.5rem"><strong id="f-count-${i.id}">${Number(i.followers||0).toLocaleString()}</strong> Followers</p>

      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap">
        ${followBtn}
        ${unfollowBtn}
      </div>

      ${state.isLoggedIn && i.social_link ? `<div style="margin-top:0.5rem"><a href="${escapeHtml(i.social_link)}" target="_blank" onclick="event.stopPropagation();" class="btn btn-primary">Visit Social Profile</a></div>` : ''}

      <div class="actions" style="margin-top:1rem">
        ${editBtn}
        ${deleteBtn}
      </div>
    </div>
  `;
}
function renderInfluencersPage() {
  const list = getFilteredResults().influencers;
  const addBtn = isAdminUser() ? `<button class="btn btn-secondary" onclick="toggleInfluencerForm()">${state.showInfluencerForm ? 'Close Form' : 'Add Influencer'}</button>` : '';
  return `
    <h1 style="display:flex;justify-content:space-between;align-items:center">
      <span>Find Influencers</span>
      <div>
        ${addBtn}
      </div>
    </h1>
    ${state.showInfluencerForm ? influencerFormHTML() : ''}
    <div class="card-grid">${list.length ? list.map(renderInfluencerCard).join("") : "<p>No influencers found.</p>"}</div>
  `;
}
function influencerFormHTML() {
  const e = state.editingInfluencer || {};
  
  const priceDropdowns = isAdminUser() ? `
    <div class="form-group"><label>Price (One Post)</label>
      <select id="i-price-post">
        <option value="">Select</option>
        <option value="₹5,000" ${e.price_post==="₹5,000"?"selected":""}>₹5,000</option>
        <option value="₹10,000" ${e.price_post==="₹10,000"?"selected":""}>₹10,000</option>
        <option value="₹25,000" ${e.price_post==="₹25,000"?"selected":""}>₹25,000</option>
        <option value="₹50,000" ${e.price_post==="₹50,000"?"selected":""}>₹50,000</option>
        <option value="₹100,000" ${e.price_post==="₹100,000"?"selected":""}>₹100,000</option>
      </select>
    </div>
    <div class="form-group"><label>Price (One Video)</label>
      <select id="i-price-video">
        <option value="">Select</option>
        <option value="₹5,000" ${e.price_video==="₹5,000"?"selected":""}>₹5,000</option>
        <option value="₹10,000" ${e.price_video==="₹10,000"?"selected":""}>₹10,000</option>
        <option value="₹25,000" ${e.price_video==="₹25,000"?"selected":""}>₹25,000</option>
        <option value="₹50,000" ${e.price_video==="₹50,000"?"selected":""}>₹50,000</option>
        <option value="₹100,000" ${e.price_video==="₹100,000"?"selected":""}>₹100,000</option>
      </select>
    </div>
    <div class="form-group"><label>Price (Promotion Package)</label>
      <select id="i-price-promotion">
        <option value="">Select</option>
        <option value="₹5,000" ${e.price_promotion==="₹5,000"?"selected":""}>₹5,000</option>
        <option value="₹10,000" ${e.price_promotion==="₹10,000"?"selected":""}>₹10,000</option>
        <option value="₹25,000" ${e.price_promotion==="₹25,000"?"selected":""}>₹25,000</option>
        <option value="₹50,000" ${e.price_promotion==="₹50,000"?"selected":""}>₹50,000</option>
        <option value="₹100,000" ${e.price_promotion==="₹100,000"?"selected":""}>₹100,000</option>
      </select>
    </div>
  ` : ( (e.price_post || e.price_video || e.price_promotion) ? `
    <div class="form-group"><label>Pricing (read-only)</label>
      <div style="background:#f9fafb;border-radius:6px;padding:8px">
        <div>Post: ${escapeHtml(e.price_post || "—")}</div>
        <div>Video: ${escapeHtml(e.price_video || "—")}</div>
        <div>Promo: ${escapeHtml(e.price_promotion || "—")}</div>
      </div>
    </div>
  ` : "" );

  return `
    <section class="form-section" style="max-width:720px;margin:0 auto 1.5rem">
      <h2>${e.id ? 'Edit Influencer' : 'Add Influencer'}</h2>
      <form id="influencer-form">
        <input type="hidden" id="i-id" value="${e.id || ''}" />
        <div class="form-group"><label>Name</label><input id="i-name" required value="${escapeHtml(e.name||'')}" /></div>
        <div class="form-group"><label>Niche</label><input id="i-niche" required value="${escapeHtml(e.niche||'')}" /></div>
        <div class="form-group"><label>Followers</label><input id="i-followers" type="number" required value="${escapeHtml(e.followers||0)}" /></div>
        <div class="form-group"><label>Bio</label><textarea id="i-bio">${escapeHtml(e.bio||'')}</textarea></div>
        <div class="form-group"><label>Image URL</label><input id="i-img" placeholder="https://example.com/photo.jpg" value="${escapeHtml(e.image_url||'')}" /></div>
        <div class="form-group"><label>Social Media Link</label><input id="i-social" placeholder="https://instagram.com/username" value="${escapeHtml(e.social_link||'')}" /></div>

        ${priceDropdowns}

        <button class="btn btn-primary" style="width:100%;margin-top:0.5rem">${e.id ? 'Save Changes' : 'Create Profile'}</button>
      </form>
    </section>
  `;
}
function renderCampaignCard(c) {
  const canEdit = c.can_edit || (state.isLoggedIn && state.user && c.user_id === state.user.id);
  const editable = isAdminUser() ? true : canEdit;
  const editBtn = editable ? `<button class="btn action-small btn-secondary" onclick="event.stopPropagation(); startEditCampaign(${c.id})">Edit</button>` : '';
  const deleteBtn = editable ? `<button class="btn action-small btn-secondary" onclick="event.stopPropagation(); deleteCampaign(${c.id})">Delete</button>` : '';
  return `
    <div class="card" onclick="setState({ selectedCampaignId: ${c.id} })">
      <h3 class="card-title" style="color:var(--primary-color);margin-bottom:0.5rem">${escapeHtml(c.title)}</h3>
      <p style="margin-top:0">${escapeHtml((c.description||"").slice(0,120))}${(c.description && c.description.length>120)? "..." : ""}</p>
      <p style="margin-top:0.5rem"><strong>Budget:</strong> ₹${Number(c.budget||0).toLocaleString()}</p>
      <p><strong>Niche:</strong> ${escapeHtml(c.target_niche||"Any")}</p>

      ${state.isLoggedIn && c.campaign_link ? `
        <div style="margin-top:0.5rem">
          <a href="${escapeHtml(c.campaign_link)}" target="_blank" onclick="event.stopPropagation();" class="btn btn-primary">Visit Campaign Page</a>
        </div>
      ` : ''}

      <div class="actions" style="margin-top:1rem">
        ${editBtn}
        ${deleteBtn}
      </div>
    </div>
  `;
}
function renderCampaignsPage() {
  const list = getFilteredResults().campaigns;
  const addBtn = isAdminUser() ? `<button class="btn btn-secondary" onclick="toggleCampaignForm()">${state.showCampaignForm ? 'Close Form' : 'Post Campaign'}</button>` : '';
  return `
    <h1 style="display:flex;justify-content:space-between;align-items:center">
      <span>Available Campaigns</span>
      <div>
        ${addBtn}
      </div>
    </h1>
    ${state.showCampaignForm ? campaignFormHTML() : ''}
    <div class="card-grid">${list.length ? list.map(renderCampaignCard).join("") : "<p>No campaigns found.</p>"}</div>
  `;
}
function campaignFormHTML() {
  const e = state.editingCampaign || {};
  return `
    <section class="form-section" style="max-width:720px;margin:0 auto 1.5rem">
      <h2>${e.id ? 'Edit Campaign' : 'Post a Campaign'}</h2>
      <form id="campaign-form">
        <input type="hidden" id="c-id" value="${e.id || ''}" />
        <div class="form-group"><label>Title</label><input id="c-title" required value="${escapeHtml(e.title||'')}" /></div>
        <div class="form-group"><label>Description</label><textarea id="c-description" required>${escapeHtml(e.description||'')}</textarea></div>
        <div class="form-group"><label>Budget (INR)</label><input id="c-budget" type="number" required value="${escapeHtml(e.budget||0)}" /></div>
        <div class="form-group"><label>Target Niche</label><input id="c-niche" required value="${escapeHtml(e.target_niche||'')}" /></div>

        <div class="form-group"><label>Campaign Link</label><input id="c-link" placeholder="https://example.com/campaign" value="${escapeHtml(e.campaign_link||'')}" /></div>

        <button class="btn btn-primary" style="width:100%;margin-top:0.5rem">${e.id ? 'Save Changes' : 'Post Campaign'}</button>
      </form>
    </section>
  `;
}
function renderInfluencerDetailPage(i) {
  if (!i) return "<p>Influencer not found.</p>";
  const img = i.image_url || "https://via.placeholder.com/400x300?text=No+Image";
  const admin = isAdminUser();
  const isOwner = state.isLoggedIn && state.user && i.user_id === state.user.id;
  const followVisible = (!admin) && (typeof i.can_follow !== "undefined") ? !!i.can_follow : (state.isLoggedIn && state.user && i.user_id !== state.user.id && !state.following.includes(i.id));
  const unfollowVisible = (!admin) && (typeof i.can_unfollow !== "undefined") ? !!i.can_unfollow : (state.isLoggedIn && state.user && i.user_id !== state.user.id && state.following.includes(i.id));
  const followBtn = followVisible ? `<button class="btn btn-success" onclick="followInfluencer(${i.id})">Follow</button>` : '';
  const unfollowBtn = unfollowVisible ? `<button class="btn btn-secondary" onclick="unfollowInfluencer(${i.id})">Unfollow</button>` : '';
  const editBtn = (admin || isOwner) ? `<button class="btn btn-secondary" onclick="startEditInfluencerFromDetail(${i.id})">Edit</button>` : '';
  const deleteBtn = (admin || isOwner) ? `<button class="btn btn-secondary" onclick="deleteInfluencer(${i.id})">Delete</button>` : '';

  
  const promoPriceBadge = `
    <div style="position:absolute; top:16px; right:16px;">
      <div style="background:white;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);font-weight:700;text-align:right;line-height:1.25;">
        <div style="font-size:13px;color:#222">Post: ${escapeHtml(i.price_post || "—")}</div>
        <div style="font-size:13px;color:#222">Video: ${escapeHtml(i.price_video || "—")}</div>
        <div style="font-size:13px;color:#222">Promo: ${escapeHtml(i.price_promotion || "—")}</div>
      </div>
    </div>
  `;

  return `
    <div class="detail-card" style="position:relative">
      ${promoPriceBadge}
      <div class="detail-header"><button class="btn btn-secondary" onclick="setState({ selectedInfluencerId:null, currentPage:'influencers' })">← Back</button></div>
      <img src="${escapeHtml(img)}" style="width:150px;height:150px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1rem" alt="${escapeHtml(i.name)}"/>
      <h2 style="text-align:center">${escapeHtml(i.name)}</h2>

      ${state.isLoggedIn && i.social_link ? `<p style="text-align:center;margin-top:10px;"><a href="${escapeHtml(i.social_link)}" target="_blank" class="btn btn-primary">Visit Social Profile</a></p>` : ''}

      <div style="text-align:center;margin-top:8px">${followBtn} ${unfollowBtn} ${editBtn} ${deleteBtn}</div>
      <div class="detail-info" style="margin-top:16px">
        <div class="info-block"><span>Followers</span><p>${Number(i.followers||0).toLocaleString()}</p></div>
        <div class="info-block"><span>Niche</span><p>${escapeHtml(i.niche)}</p></div>
      </div>
      <p style="margin-top:1rem">${escapeHtml(i.bio||"")}</p>
    </div>
  `;
}
function renderCampaignDetailPage(c) {
  if (!c) return "<p>Campaign not found.</p>";
  const isOwner = state.isLoggedIn && state.user && c.user_id === state.user.id;
  const editBtn = (isAdminUser() || isOwner) ? `<button class="btn btn-secondary" onclick="startEditCampaignFromDetail(${c.id})">Edit</button>` : '';
  const deleteBtn = (isAdminUser() || isOwner) ? `<button class="btn btn-secondary" onclick="deleteCampaign(${c.id})">Delete</button>` : '';
  return `
    <div class="detail-card">
      <div class="detail-header"><button class="btn btn-secondary" onclick="setState({ selectedCampaignId:null, currentPage:'campaigns' })">← Back</button></div>
      <h2>${escapeHtml(c.title)}</h2>

      ${state.isLoggedIn && c.campaign_link ? `<p style="text-align:center;margin-top:10px;"><a href="${escapeHtml(c.campaign_link)}" target="_blank" class="btn btn-primary">Visit Campaign Page</a></p>` : ''}

      <p>${escapeHtml(c.description)}</p>
      <div style="margin-top:12px">${editBtn} ${deleteBtn}</div>
      <div class="detail-info" style="margin-top:12px">
        <div class="info-block"><span>Budget</span><p>₹${Number(c.budget||0).toLocaleString()}</p></div>
        <div class="info-block"><span>Niche</span><p>${escapeHtml(c.target_niche||"")}</p></div>
        <div class="info-block"><span>ID</span><p>${c.id}</p></div>
      </div>
    </div>
  `;
}
async function loadAllData() {
  try {
    const userId = state.user?.id || 0;
    const [infRes, campRes] = await Promise.all([
      fetch(API_BASE_URL + `/influencers?user_id=${userId}`),
      fetch(API_BASE_URL + `/campaigns?user_id=${userId}`)
    ]);
    const influencers = await infRes.json();
    const campaigns = await campRes.json();
    if (Array.isArray(influencers)) setState({ influencers });
    if (Array.isArray(campaigns)) setState({ campaigns });
    if (state.isLoggedIn && state.user && state.user.id) {
      await fetchFollowing(state.user.id);
    }
  } catch (err) {
    console.error(err);
    setMessage("Failed to load server data", "error");
  }
}
async function submitData(endpoint, data, method = "POST") {
  try {
    const res = await fetch(API_BASE_URL + endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.error) return setMessage(json.error, "error");
    setMessage(json.message || "Success", "success");
    setState({ showInfluencerForm: false, showCampaignForm: false, editingInfluencer: null, editingCampaign: null });
    await loadAllData();
  } catch (err) {
    console.error(err);
    setMessage("Request failed", "error");
  }
}
async function handleLogin(email, password) {
  try {
    const res = await fetch(API_BASE_URL + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (json.error) return setMessage(json.error, "error");
    localStorage.setItem("connectus_user", JSON.stringify(json.user));
    localStorage.setItem("connectus_user_login_at", Date.now());
    setState({ isLoggedIn: true, user: json.user, currentPage: "home" });
    setMessage("Welcome " + (json.user.name || "user"));
    startSessionTimer();
    fetchFollowing(json.user.id);
    await loadAllData();
  } catch (err) {
    console.error(err);
    setMessage("Login failed", "error");
  }
}
async function handleRegister(name, email, password) {
  try {
    const res = await fetch(API_BASE_URL + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const json = await res.json();
    if (json.error) return setMessage(json.error, "error");
    localStorage.setItem("connectus_user", JSON.stringify(json.user));
    localStorage.setItem("connectus_user_login_at", Date.now());
    setState({ isLoggedIn: true, user: json.user, currentPage: "home" });
    setMessage("Account created!");
    startSessionTimer();
    fetchFollowing(json.user.id);
    await loadAllData();
  } catch (err) {
    console.error(err);
    setMessage("Registration failed", "error");
  }
}
async function fetchFollowing(userId) {
  try {
    const res = await fetch(API_BASE_URL + `/influencers/follows?user_id=${userId}`);
    const json = await res.json();
    if (Array.isArray(json)) {
      setState({ following: json });
    } else {
      const derived = state.influencers.filter(i => i.is_following).map(i => i.id);
      setState({ following: derived });
    }
  } catch (err) {
    console.error(err);
    const derived = state.influencers.filter(i => i.is_following).map(i => i.id);
    setState({ following: derived });
  }
}
async function followInfluencer(infId) {
  if (!state.isLoggedIn || !state.user) {
    setMessage("Please login to follow.", "error");
    return;
  }
  const inf = state.influencers.find(x => x.id === infId);
  if (inf && inf.user_id === state.user.id) {
    setMessage("Cannot follow your own profile.", "error");
    return;
  }
  const prevInfluencers = JSON.parse(JSON.stringify(state.influencers));
  const prevFollowing = [...state.following];
  const updated = state.influencers.map(i => {
    if (i.id === infId) {
      return { ...i, can_follow: false, can_unfollow: true, followers: Number(i.followers || 0) + 1 };
    }
    return i;
  });
  setState({ influencers: updated, following: [...state.following, infId] });
  try {
    const res = await fetch(API_BASE_URL + `/influencers/${infId}/follow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const json = await res.json();
    if (json.error) {
      setState({ influencers: prevInfluencers, following: prevFollowing });
      return setMessage(json.error, "error");
    }
    setMessage("Followed influencer.");
    await loadAllData();
  } catch (err) {
    console.error(err);
    setState({ influencers: prevInfluencers, following: prevFollowing });
    setMessage("Request failed", "error");
  }
}
async function unfollowInfluencer(infId) {
  if (!state.isLoggedIn || !state.user) {
    setMessage("Please login to unfollow.", "error");
    return;
  }
  const inf = state.influencers.find(x => x.id === infId);
  if (inf && inf.user_id === state.user.id) {
    setMessage("Cannot unfollow your own profile.", "error");
    return;
  }
  const prevInfluencers = JSON.parse(JSON.stringify(state.influencers));
  const prevFollowing = [...state.following];
  const updated = state.influencers.map(i => {
    if (i.id === infId) {
      return { ...i, can_follow: true, can_unfollow: false, followers: Math.max(0, Number(i.followers || 0) - 1) };
    }
    return i;
  });
  setState({ influencers: updated, following: state.following.filter(x => x !== infId) });
  try {
    const res = await fetch(API_BASE_URL + `/influencers/${infId}/unfollow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const json = await res.json();
    if (json.error) {
      setState({ influencers: prevInfluencers, following: prevFollowing });
      return setMessage(json.error, "error");
    }
    setMessage("Unfollowed influencer.");
    await loadAllData();
  } catch (err) {
    console.error(err);
    setState({ influencers: prevInfluencers, following: prevFollowing });
    setMessage("Request failed", "error");
  }
}
function toggleInfluencerForm() {
  setState({ showInfluencerForm: !state.showInfluencerForm, editingInfluencer: null, selectedInfluencerId: null });
}
function startEditInfluencer(id) {
  const inf = state.influencers.find(x => x.id === id);
  if (!inf) return setMessage("Influencer not found", "error");
  if (!state.isLoggedIn) return setMessage("Not allowed", "error");
  // allow creator or admin to open edit form
  if (!(isAdminUser() || state.user.id === inf.user_id)) return setMessage("Not allowed", "error");
  setState({ currentPage: "influencers", selectedInfluencerId: null, showInfluencerForm: true, editingInfluencer: { ...inf } });
}
function startEditInfluencerFromDetail(id) {
  startEditInfluencer(id);
}
async function deleteInfluencer(id) {
  if (!state.isLoggedIn || !state.user) return setMessage("You must be logged in to delete", "error");
  const inf = state.influencers.find(x => x.id === id);
  if (!inf) return setMessage("Influencer not found", "error");
  if (!(isAdminUser() || state.user.id === inf.user_id)) return setMessage("You are not allowed to delete this influencer", "error");
  if (!confirm("Delete this influencer? This cannot be undone.")) return;
  try {
    const res = await fetch(API_BASE_URL + `/influencers/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const json = await res.json();
    if (json.error) return setMessage(json.error, "error");
    setMessage("Influencer deleted.");
    await loadAllData();
    await fetchFollowing(state.user.id);
  } catch (err) {
    console.error(err);
    setMessage("Delete failed", "error");
  }
}
function toggleCampaignForm() {
  setState({ showCampaignForm: !state.showCampaignForm, editingCampaign: null, selectedCampaignId: null });
}
function startEditCampaign(id) {
  const camp = state.campaigns.find(x => x.id === id);
  if (!camp) return setMessage("Campaign not found", "error");
  if (!state.isLoggedIn) return setMessage("Not allowed", "error");
  if (!(isAdminUser() || state.user.id === camp.user_id)) return setMessage("Not allowed", "error");
  setState({ currentPage: "campaigns", selectedCampaignId: null, showCampaignForm: true, editingCampaign: { ...camp } });
}
function startEditCampaignFromDetail(id) {
  startEditCampaign(id);
}
async function deleteCampaign(id) {
  if (!state.isLoggedIn || !state.user) return setMessage("You must be logged in to delete", "error");
  const camp = state.campaigns.find(x => x.id === id);
  if (!camp) return setMessage("Campaign not found", "error");
  if (!(isAdminUser() || state.user.id === camp.user_id)) return setMessage("You are not allowed to delete this campaign", "error");
  if (!confirm("Delete this campaign? This cannot be undone.")) return;
  try {
    const res = await fetch(API_BASE_URL + `/campaigns/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: state.user.id })
    });
    const json = await res.json();
    if (json.error) return setMessage(json.error, "error");
    setMessage("Campaign deleted.");
    await loadAllData();
  } catch (err) {
    console.error(err);
    setMessage("Delete failed", "error");
  }
}
function attachEventListeners() {
  document.getElementById("influencer-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const id = document.getElementById("i-id")?.value;
    const payload = {
      user_id: state.user?.id || null,
      name: document.getElementById("i-name").value,
      niche: document.getElementById("i-niche").value,
      followers: Number(document.getElementById("i-followers").value || 0),
      bio: document.getElementById("i-bio").value || "",
      image_url: document.getElementById("i-img")?.value || null,
      social_link: document.getElementById("i-social")?.value || null,
      // include pricing fields (only present when admin saw the dropdowns)
      price_post: document.getElementById("i-price-post")?.value || null,
      price_video: document.getElementById("i-price-video")?.value || null,
      price_promotion: document.getElementById("i-price-promotion")?.value || null
    };
    if (id) {
      submitData(`/influencers/${id}`, { ...payload, user_id: state.user?.id || null }, "PUT");
    } else {
      submitData("/influencers", { ...payload, user_id: state.user?.id || null }, "POST");
    }
    e.target.reset();
  });
  document.getElementById("campaign-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const id = document.getElementById("c-id")?.value;
    const payload = {
      user_id: state.user?.id || null,
      title: document.getElementById("c-title").value,
      description: document.getElementById("c-description").value,
      budget: Number(document.getElementById("c-budget").value || 0),
      target_niche: document.getElementById("c-niche").value,
      campaign_link: document.getElementById("c-link")?.value || null
    };
    if (id) {
      submitData(`/campaigns/${id}`, payload, "PUT");
    } else {
      submitData("/campaigns", payload, "POST");
    }
    e.target.reset();
  });
  document.getElementById("login-form")?.addEventListener("submit", e => {
    e.preventDefault();
    handleLogin(document.getElementById("email")?.value, document.getElementById("password")?.value);
  });
  document.getElementById("register-form")?.addEventListener("submit", e => {
    e.preventDefault();
    handleRegister(document.getElementById("r-name")?.value, document.getElementById("r-email")?.value, document.getElementById("r-password")?.value);
  });
  document.getElementById("home-link")?.addEventListener("click", e => { e.preventDefault(); setState({ currentPage: "home", selectedInfluencerId: null, selectedCampaignId: null }); });
  document.getElementById("influencers-link")?.addEventListener("click", e => { e.preventDefault(); setState({ currentPage: "influencers", selectedInfluencerId: null, selectedCampaignId: null }); });
  document.getElementById("campaigns-link")?.addEventListener("click", e => { e.preventDefault(); setState({ currentPage: "campaigns", selectedInfluencerId: null, selectedCampaignId: null }); });
  loginButton?.addEventListener("click", () => setState({ currentPage: "login", selectedInfluencerId: null }));
  logoutButton?.addEventListener("click", () => {
    localStorage.removeItem("connectus_user");
    localStorage.removeItem("connectus_user_login_at");
    clearSessionTimer();
    setState({ isLoggedIn: false, user: null, currentPage: "home", following: [] });
    setMessage("Logged out", "success");
  });
  searchInput?.addEventListener("input", (e) => setState({ searchQuery: e.target.value }));
  const clickableEls = document.querySelectorAll("button, input, textarea, a");
  clickableEls.forEach(el => el.addEventListener("click", resetSessionTimer));
}
function renderLoginPage() {
  return `
    <section class="form-section" style="max-width:420px;margin:0 auto;">
      <h2>Login</h2>
      <form id="login-form">
        <div class="form-group"><label>Email</label><input id="email" type="email" required autocomplete="email" /></div>
        <div class="form-group"><label>Password</label><input id="password" type="password" required autocomplete="current-password" /></div>
        <button class="btn btn-primary" style="width:100%">Log in</button>
      </form>
      <p style="text-align:center;margin-top:10px">Don't have account? <a href="#" onclick="setState({ currentPage:'register' })">Register</a></p>
    </section>
  `;
}
function renderRegisterPage() {
  return `
    <section class="form-section" style="max-width:420px;margin:0 auto;">
      <h2>Register</h2>
      <form id="register-form">
        <div class="form-group"><label>Full name</label><input id="r-name" required autocomplete="name"/></div>
        <div class="form-group"><label>Email</label><input id="r-email" type="email" required autocomplete="email"/></div>
        <div class="form-group"><label>Password</label><input id="r-password" type="password" required autocomplete="new-password"/></div>
        <button class="btn btn-primary" style="width:100%">Create account</button>
      </form>
      <p style="text-align:center;margin-top:10px">Already have account? <a href="#" onclick="setState({ currentPage:'login' })">Login</a></p>
    </section>
  `;
}
function escapeHtml(str){ if(str===null||str===undefined) return ""; return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'", "&#039;");}
window.onload = () => {
  try {
    const saved = localStorage.getItem("connectus_user");
    const savedAt = Number(localStorage.getItem("connectus_user_login_at") || 0);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.id) {
        const now = Date.now();
        if (savedAt && (now - savedAt) < SESSION_TIMEOUT_MS) {
          state.isLoggedIn = true;
          state.user = user;
          startSessionTimer();
        } else {
          localStorage.removeItem("connectus_user");
          localStorage.removeItem("connectus_user_login_at");
        }
      }
    }
  } catch (e) {
    console.error("Failed to load saved user", e);
  }
  loadAllData();
  render();
};
