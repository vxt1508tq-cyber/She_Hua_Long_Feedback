(() => {
  const cfg = window.SHE_HUA_LONG_CONFIG || {};
  const MAPS_URL = cfg.googleMapsUrl || "https://maps.app.goo.gl/YtP8Dwm1LrDLKzMe7?g_st=ic";
  const supabaseLib = window.supabase;
  const supabase = (cfg.supabaseUrl && cfg.supabasePublishableKey && cfg.supabasePublishableKey !== "PASTE_YOUR_PUBLISHABLE_KEY_HERE" && supabaseLib)
    ? supabaseLib.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey)
    : null;

  const $ = (id) => document.getElementById(id);
  const form = $("feedbackForm");
  const successPanel = $("successPanel");
  const progressBar = $("progressBar");
  const progressPct = $("progressPct");
  const progressLabel = $("progressLabel");
  const overallScore = $("overallScore");
  const reviewCard = $("reviewCard");
  const mapsButton = $("mapsButton");
  const adminPanel = $("adminPanel");
  const loginView = $("loginView");
  const dashboardView = $("dashboardView");
  const detailBackdrop = $("detailBackdrop");
  const detailStatus = $("detailStatus");
  const detailStatusBadge = $("detailStatusBadge");
  let currentUser = null;
  let currentDetail = null;

  $("mapsButton").href = MAPS_URL;
  $("visitDate").value = new Date().toISOString().slice(0,10);

  const ratingState = { food_rating:0, staff_rating:0, space_rating:0, service_rating:0, overall_rating:0 };

  document.querySelectorAll(".star-rating").forEach((wrap) => {
    const key = wrap.dataset.rating;
    for (let i=1; i<=5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = "★";
      btn.setAttribute("aria-label", `${i} sao`);
      btn.addEventListener("click", () => setRating(key, i));
      wrap.appendChild(btn);
    }
  });

  function setRating(key, value) {
    ratingState[key] = value;
    const wrap = document.querySelector(`[data-rating="${key}"]`);
    if (!wrap) return;
    [...wrap.children].forEach((b, idx) => b.classList.toggle("active", idx < value));
    if (key === "overall_rating") overallScore.textContent = Number(value).toFixed(1);
    updateProgress();
  }

  function updateProgress() {
    const inputs = [...form.querySelectorAll("input, textarea")];
    const filled = inputs.filter(el => {
      if (el.type === "radio" || el.type === "checkbox") return el.checked;
      return el.value.trim() !== "";
    }).length;
    const ratings = Object.values(ratingState).filter(v => v > 0).length;
    const pct = Math.min(100, Math.round(((filled + ratings) / (inputs.length + 5)) * 100));
    progressBar.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
    progressLabel.textContent = pct === 0 ? "Bắt đầu feedback" : pct < 100 ? "Đang hoàn thiện feedback" : "Sẵn sàng gửi";
  }

  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);

  function checkedLabels(groupNames) {
    return groupNames
      .filter(name => form.querySelector(`input[name="${name}"]`)?.checked)
      .map(name => form.querySelector(`input[name="${name}"]`)?.closest("label")?.innerText.trim())
      .filter(Boolean);
  }

  function collectFeedback() {
    const returnPlan = form.querySelector('input[name="return_plan"]:checked')?.value || "";
    const recommend = form.querySelector('input[name="recommend"]:checked')?.value || "";
    const orderType = form.querySelector('input[name="order_type"]:checked')?.value || "";

    const criteria = [
      ["Món ăn", ["food_serve_time","food_spicy","food_dry","food_fresh","food_taste","food_presentation"]],
      ["Nhân viên", ["staff_attitude","staff_communication","staff_style","staff_knowledge","staff_skill","staff_proactive"]],
      ["Không gian", ["space_hygiene","space_comfort","space_decor","space_table","space_smoke","space_ac"]],
      ["Phục vụ", ["service_order_time","service_food_time","service_wait","service_missing","service_wrong","service_extra_request"]]
    ];
    const criterionText = criteria.map(([title,names]) => {
      const values = checkedLabels(names);
      return values.length ? `${title}: ${values.join("; ")}` : "";
    }).filter(Boolean).join("\n");

    const note = $("feedbackNote").value.trim();
    const sections = [];
    if (criterionText) sections.push("Tiêu chí khách chọn:\n" + criterionText);
    if (note) sections.push("Góp ý thêm:\n" + note);
    if (returnPlan) sections.push("Khả năng quay lại: " + returnPlan);
    if (recommend) sections.push("Giới thiệu bạn bè: " + recommend);
    if (orderType) sections.push("Hình thức: " + orderType);

    return {
      table_number: form.querySelector('[name="table_number"]').value.trim() || null,
      party_size: Number(form.querySelector('[name="guest_count"]').value || 0) || null,
      food_rating: ratingState.food_rating || null,
      staff_rating: ratingState.staff_rating || null,
      atmosphere_rating: ratingState.space_rating || null,
      service_speed_rating: ratingState.service_rating || null,
      overall_rating: ratingState.overall_rating || null,
      comment: sections.join("\n\n") || null,
      contact_requested: false,
      contact_info: null,
      status: "new"
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) {
      showToast("Chưa cấu hình Supabase. Mở config.js và nhập Publishable Key.");
      return;
    }
    if (!ratingState.overall_rating) {
      showToast("Bạn hãy chọn mức độ hài lòng chung từ 1–5 sao.");
      document.querySelector('[data-rating="overall_rating"]')?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }

    const payload = collectFeedback();
    const { error } = await supabase.from("feedback").insert(payload);
    if (error) {
      console.error(error);
      showToast("Không thể gửi feedback: " + error.message);
      return;
    }

    const happy = ratingState.overall_rating >= 4;
    reviewCard.classList.toggle("hidden", !happy);
    $("successMessage").textContent = happy
      ? "Cảm ơn quý khách! Nếu hài lòng với trải nghiệm tại She Ha Long, quý khách có thể đánh giá chúng tôi trên Google Maps."
      : "Rất tiếc vì trải nghiệm của quý khách chưa tốt. She Ha Long rất mong nhận được góp ý để cải thiện.";

    form.classList.add("hidden");
    document.querySelector(".progress-wrap").classList.add("hidden");
    successPanel.classList.remove("hidden");
    successPanel.scrollIntoView({behavior:"smooth",block:"start"});
  });

  $("newFeedback").addEventListener("click", () => {
    form.reset();
    Object.keys(ratingState).forEach(k => setRating(k, 0));
    $("visitDate").value = new Date().toISOString().slice(0,10);
    successPanel.classList.add("hidden");
    form.classList.remove("hidden");
    document.querySelector(".progress-wrap").classList.remove("hidden");
    updateProgress();
    window.scrollTo({top:0,behavior:"smooth"});
  });

  $("adminToggle").addEventListener("click", async () => {
    adminPanel.classList.add("open");
    adminPanel.setAttribute("aria-hidden","false");
    await refreshAuthView();
  });
  $("closeAdmin").addEventListener("click", closeAdmin);
  adminPanel.addEventListener("click", e => { if (e.target === adminPanel) closeAdmin(); });

  function closeAdmin() {
    adminPanel.classList.remove("open");
    adminPanel.setAttribute("aria-hidden","true");
  }

  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginError").textContent = "";
    if (!supabase) return $("loginError").textContent = "Chưa cấu hình Supabase.";
    const email = $("ownerEmail").value.trim();
    const password = $("ownerPassword").value;
    const { data, error } = await supabase.auth.signInWithPassword({email,password});
    if (error) return $("loginError").textContent = "Email hoặc mật khẩu không đúng.";
    const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, role").eq("id",data.user.id).single();
    if (profileError || !profile || !["owner","admin"].includes(profile.role)) {
      await supabase.auth.signOut();
      return $("loginError").textContent = "Tài khoản chưa có quyền chủ cửa hàng.";
    }
    currentUser = data.user;
    renderLoggedIn(profile);
    await loadDashboard();
  });

  $("logoutButton").addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    currentUser = null;
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    $("ownerPassword").value = "";
  });

  async function refreshAuthView() {
    if (!supabase) {
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      $("loginError").textContent = "Chưa cấu hình Supabase trong config.js.";
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id",session.user.id).single();
    if (profile && ["owner","admin"].includes(profile.role)) {
      currentUser = session.user;
      renderLoggedIn(profile);
      await loadDashboard();
    } else {
      await supabase.auth.signOut();
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
    }
  }

  function renderLoggedIn(profile) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    $("ownerName").textContent = profile.full_name || "Chủ She Hua Long";
    $("ownerEmailText").textContent = currentUser?.email || "";
  }

  $("refreshDashboard").addEventListener("click", loadDashboard);

  async function loadDashboard() {
    if (!supabase || !currentUser) return;
    const { data, error } = await supabase.from("feedback").select("*").order("created_at",{ascending:false});
    if (error) {
      showToast("Không tải được feedback: " + error.message);
      return;
    }
    const rows = data || [];
    const avg = key => {
      const nums = rows.map(r => Number(r[key] || 0)).filter(Boolean);
      return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
    };
    $("statTotal").textContent = rows.length;
    $("statAvg").textContent = avg("overall_rating").toFixed(1);
    $("statHappy").textContent = rows.length ? Math.round(rows.filter(r => Number(r.overall_rating || 0) >= 4).length/rows.length*100) + "%" : "0%";
    $("statOpen").textContent = rows.filter(r => r.status !== "resolved").length;
    $("metricFood").textContent = avg("food_rating").toFixed(1) + " ⭐";
    $("metricStaff").textContent = avg("staff_rating").toFixed(1) + " ⭐";
    $("metricSpace").textContent = avg("atmosphere_rating").toFixed(1) + " ⭐";
    $("metricService").textContent = avg("service_speed_rating").toFixed(1) + " ⭐";

    const list = $("feedbackList");
    if (!rows.length) {
      list.innerHTML = '<div class="empty-state">Chưa có feedback nào.</div>';
      return;
    }
    list.innerHTML = rows.slice(0,30).map(r => {
      const statusText = r.status === "resolved" ? "Đã xử lý" : r.status === "processing" ? "Đang xử lý" : "Mới";
      const statusClass = r.status === "resolved" ? "done" : r.status === "processing" ? "progress" : "new";
      const date = new Date(r.created_at).toLocaleString("vi-VN");
      return `<button class="feedback-item feedback-click" data-id="${escapeHtml(r.id)}">
        <div class="feedback-top"><div><strong>⭐ ${Number(r.overall_rating||0)}/5 • ${escapeHtml(r.table_number||"Chưa nhập bàn")}</strong>
        <div class="feedback-meta">${date} • ${escapeHtml(String(r.party_size||"?"))} người</div></div>
        <span class="status ${statusClass}">${statusText}</span></div>
        <p class="feedback-text">${escapeHtml(r.comment || "Không có ghi chú thêm.")}</p>
      </button>`;
    }).join("");

    list.querySelectorAll(".feedback-click").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = rows.find(r => String(r.id) === String(btn.dataset.id));
        if (row) openDetail(row);
      });
    });
  }

  function openDetail(row) {
    currentDetail = row;
    $("detailRating").textContent = `⭐ ${Number(row.overall_rating||0)}/5`;
    $("detailMeta").textContent = `Bàn: ${row.table_number || "–"} • ${new Date(row.created_at).toLocaleString("vi-VN")} • ${row.party_size || "?"} người`;
    $("detailComment").textContent = row.comment || "Không có góp ý.";
    $("ownerNote").value = row.owner_note || "";
    detailStatus.value = row.status || "new";
    updateStatusBadge();
    detailBackdrop.classList.remove("hidden");
  }

  function updateStatusBadge() {
    const map = {new:["Mới","new"],processing:["Đang xử lý","progress"],resolved:["Đã xử lý","done"]};
    const [text, cls] = map[detailStatus.value] || map.new;
    detailStatusBadge.textContent = text;
    detailStatusBadge.className = `status ${cls}`;
  }
  detailStatus.addEventListener("change", updateStatusBadge);
  $("closeDetail").addEventListener("click", () => detailBackdrop.classList.add("hidden"));
  detailBackdrop.addEventListener("click", e => { if(e.target===detailBackdrop) detailBackdrop.classList.add("hidden"); });

  $("saveDetail").addEventListener("click", async () => {
    if (!supabase || !currentDetail) return;
    const patch = {status: detailStatus.value, owner_note: $("ownerNote").value.trim() || null};
    const { error } = await supabase.from("feedback").update(patch).eq("id", currentDetail.id);
    if (error) return showToast("Không thể lưu: " + error.message);
    detailBackdrop.classList.add("hidden");
    showToast("Đã lưu feedback.");
    await loadDashboard();
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function showToast(message) {
    const t = $("toast");
    t.textContent = message;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  supabase?.auth?.onAuthStateChange((_event, session) => {
    if (!session) {
      currentUser = null;
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
    }
  });

  $("mapsButton").href = MAPS_URL;
  updateProgress();
})();
