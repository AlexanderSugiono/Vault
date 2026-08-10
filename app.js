/* =========================================================
   Vaulty - Personal Finance
   App Logic - Phase 4 (Navigasi Tab + Laporan/Chart.js)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "vaulty_transactions";
  const CATEGORIES_KEY = "vaulty_categories";
  const THEME_KEY = "vaulty_theme";
  const THEMES = ["magenta", "emerald", "navy"];

  const CHART_COLORS = [
    "#7c3aed", "#db2777", "#f59e0b", "#10b981", "#3b82f6",
    "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#ef4444",
    "#22c55e", "#eab308",
  ];

  /* ---------- Default & icon library ---------- */
  const DEFAULT_CATEGORIES = [
    { name: "Makanan", type: "expense", icon: "fa-solid fa-mug-hot" },
    { name: "Transportasi", type: "expense", icon: "fa-solid fa-car-side" },
    { name: "Gaji", type: "income", icon: "fa-solid fa-wallet" },
    { name: "Belanja", type: "expense", icon: "fa-solid fa-bag-shopping" },
    { name: "Tagihan", type: "expense", icon: "fa-solid fa-file-invoice-dollar" },
    { name: "Hiburan", type: "expense", icon: "fa-solid fa-clapperboard" },
    { name: "Lainnya", type: "both", icon: "fa-solid fa-tag" },
  ];

  const ICON_OPTIONS = [
    "fa-solid fa-mug-hot",
    "fa-solid fa-car-side",
    "fa-solid fa-wallet",
    "fa-solid fa-bag-shopping",
    "fa-solid fa-file-invoice-dollar",
    "fa-solid fa-clapperboard",
    "fa-solid fa-tag",
    "fa-solid fa-house",
    "fa-solid fa-plane",
    "fa-solid fa-graduation-cap",
    "fa-solid fa-cart-shopping",
    "fa-solid fa-shield-halved",
    "fa-solid fa-gamepad",
    "fa-solid fa-piggy-bank",
    "fa-solid fa-heart-pulse",
    "fa-solid fa-mobile-screen",
  ];

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);

  const formatIDR = (value) =>
    new Intl.NumberFormat("id-ID").format(Math.round(value || 0));

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);

  /* ---------- LocalStorage: Kategori ---------- */
  const getCategories = () => {
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      if (!raw) {
        saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  };

  const saveCategories = (list) => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
  };

  const saveCategory = (data) => {
    const list = getCategories();
    list.push({ name: data.name, type: data.type, icon: data.icon });
    saveCategories(list);
  };

  const getCategoryIcon = (name) => {
    const cat = getCategories().find((c) => c.name === name);
    return cat ? cat.icon : "fa-solid fa-tag";
  };

  /* ---------- LocalStorage: Transaksi ---------- */
  const getTransactions = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const saveTransactions = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const addTransaction = (data) => {
    const list = getTransactions();
    list.push({ id: Date.now(), ...data });
    saveTransactions(list);
  };

  const updateTransaction = (id, data) => {
    const list = getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], ...data };
    saveTransactions(list);
    return true;
  };

  const deleteTransaction = (id) => {
    if (!confirm("Yakin ingin menghapus transaksi ini?")) return;
    const list = getTransactions().filter((t) => t.id !== id);
    saveTransactions(list);
    updateSummary();
    renderHomeTransactions();
    renderTransactions();
    if (!$("view-reports").classList.contains("hidden")) updateAnalytics();
    showToast("Transaksi dihapus");
  };

  /* ---------- Rekap saldo real-time ---------- */
  function updateSummary() {
    const list = getTransactions();
    const totalIncome = list
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = list
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    $("totalBalance").textContent = formatIDR(totalIncome - totalExpense);
    $("totalIncome").textContent = formatIDR(totalIncome);
    $("totalExpense").textContent = formatIDR(totalExpense);
  }

  /* ---------- Label tanggal relatif ---------- */
  function dateLabel(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((today - d) / 86400000);

    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Kemarin";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ---------- Template item transaksi ---------- */
  function txItemHTML(t) {
    return `
      <div class="tx-item">
        <span class="tx-icon ${t.type}">
          <i class="${getCategoryIcon(t.category)}"></i>
        </span>
        <div class="tx-meta">
          <p class="tx-title">${escapeHTML(t.note || t.category)}</p>
          <p class="tx-sub">${escapeHTML(t.category)} • ${dateLabel(t.date)}</p>
        </div>
        <span class="tx-amount ${t.type}">
          ${t.type === "income" ? "+" : "-"}Rp ${formatIDR(t.amount)}
        </span>
        <button class="tx-edit" data-id="${t.id}" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="tx-delete" data-id="${t.id}" title="Hapus">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }

  function emptyStateHTML(icon, title, desc, addId) {
    return `
      <div class="empty-state">
        <i class="${icon}"></i>
        <h3>${title}</h3>
        <p>${desc}</p>
        ${
          addId
            ? `<button id="${addId}" class="glass-btn-cta" type="button">
                 <i class="fa-solid fa-plus"></i>
                 <span>Tambah Transaksi</span>
               </button>`
            : ""
        }
      </div>
    `;
  }

  function attachTxItemListeners(container) {
    container.querySelectorAll(".tx-edit").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".tx-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteTransaction(Number(btn.dataset.id)));
    });
  }

  /* ---------- Render: daftar transaksi (tab Home) ---------- */
  function renderHomeTransactions() {
    const homeList = $("homeTransactionList");
    const list = [...getTransactions()].sort((a, b) => b.id - a.id).slice(0, 5);

    if (list.length === 0) {
      homeList.innerHTML = emptyStateHTML(
        "fa-solid fa-wallet",
        "Belum Ada Transaksi",
        "Mulai catat pemasukan atau pengeluaran pertama Anda.",
        "btnEmptyAddHome"
      );
      const btn = $("btnEmptyAddHome");
      if (btn) btn.addEventListener("click", openModal);
      return;
    }

    homeList.innerHTML = list.map(txItemHTML).join("");
    attachTxItemListeners(homeList);
  }

  /* ---------- Filter & render: daftar transaksi (tab Transaksi) ---------- */
  const listEl = $("transactionList");

  function getFilteredTransactions() {
    const query = $("searchInput").value.trim().toLowerCase();
    const typeFilter = $("filterType").value;
    const categoryFilter = $("filterCategory").value;

    return [...getTransactions()]
      .sort((a, b) => b.id - a.id)
      .filter((t) => {
        const text = `${t.note} ${t.category}`.toLowerCase();
        if (query && !text.includes(query)) return false;
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
        return true;
      });
  }

  function renderTransactions() {
    const list = getFilteredTransactions();
    const hasAnyTransaction = getTransactions().length > 0;

    if (list.length === 0) {
      listEl.innerHTML = hasAnyTransaction
        ? emptyStateHTML(
            "fa-solid fa-magnifying-glass",
            "Transaksi Tidak Ditemukan",
            "Coba ubah kata kunci atau filter pencarian Anda.",
            null
          )
        : emptyStateHTML(
            "fa-solid fa-wallet",
            "Belum Ada Transaksi",
            "Mulai catat pemasukan atau pengeluaran pertama Anda.",
            "btnEmptyAddTx"
          );
      const btn = $("btnEmptyAddTx");
      if (btn) btn.addEventListener("click", openModal);
      return;
    }

    listEl.innerHTML = list.map(txItemHTML).join("");
    attachTxItemListeners(listEl);
  }

  /* ---------- Dropdown kategori dinamis ---------- */
  function populateCategoryDropdowns() {
    const categories = getCategories();
    const txSelect = $("txCategory");
    const filterSelect = $("filterCategory");
    const prevTx = txSelect.value;
    const prevFilter = filterSelect.value;

    txSelect.innerHTML = categories
      .map((c) => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`)
      .join("");

    filterSelect.innerHTML =
      `<option value="all">Semua Kategori</option>` +
      categories
        .map((c) => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`)
        .join("");

    if (categories.some((c) => c.name === prevTx)) txSelect.value = prevTx;
    if (categories.some((c) => c.name === prevFilter)) filterSelect.value = prevFilter;
  }

  /* ---------- Kontrol Modal Transaksi ---------- */
  const txModal = $("txModal");
  let editingTxId = null;

  function openModal() {
    editingTxId = null;
    $("txModalTitle").textContent = "Tambah Transaksi";
    $("txSubmitBtn").textContent = "Simpan Transaksi";
    populateCategoryDropdowns();
    txModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    resetForm();
  }

  function openEditModal(id) {
    const tx = getTransactions().find((t) => t.id === id);
    if (!tx) return;

    editingTxId = id;
    populateCategoryDropdowns();

    $("txModalTitle").textContent = "Edit Transaksi";
    $("txSubmitBtn").textContent = "Simpan Perubahan";
    $("txAmount").value = tx.amount;
    $("txCategory").value = tx.category;
    $("txDate").value = tx.date;
    $("txNote").value = tx.note || "";
    setType(tx.type);
    resetValidation();

    txModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    txModal.classList.add("hidden");
    document.body.style.overflow = "";
    editingTxId = null;
  }

  function resetForm() {
    $("txForm").reset();
    resetValidation();
    $("txDate").value = new Date().toISOString().slice(0, 10);
    setType("income");
  }

  function setType(type) {
    $("txModal")
      .querySelectorAll(".type-btn")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.type === type);
      });
  }

  function resetValidation() {
    $("amountError").classList.add("hidden");
    $("dateError").classList.add("hidden");
  }

  /* ---------- Kontrol Modal Kategori ---------- */
  const catModal = $("catModal");

  function openCatModal() {
    catModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    $("catForm").reset();
    $("catNameError").classList.add("hidden");
    setCatType("income");
    setSelectedIcon("fa-solid fa-tag");
  }

  function closeCatModal() {
    catModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function setCatType(type) {
    document.querySelectorAll(".cat-type").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cattype === type);
    });
  }

  function setSelectedIcon(icon) {
    $("catIcon").value = icon;
    $("iconPicker")
      .querySelectorAll(".icon-option")
      .forEach((b) => b.classList.toggle("selected", b.dataset.icon === icon));
  }

  function renderIconPicker() {
    $("iconPicker").innerHTML = ICON_OPTIONS.map(
      (icon) => `<button type="button" class="icon-option" data-icon="${icon}"><i class="${icon}"></i></button>`
    ).join("");
    $("iconPicker").querySelectorAll(".icon-option").forEach((btn) => {
      btn.addEventListener("click", () => setSelectedIcon(btn.dataset.icon));
    });
  }

  /* ---------- Navigasi Tab ---------- */
  function switchTab(tabName) {
    const views = ["home", "transactions", "reports", "settings"];

    views.forEach((v) => {
      const el = $(`view-${v}`);
      el.classList.add("hidden");
      el.classList.remove("active");
    });

    const target = $(`view-${tabName}`);
    target.classList.remove("hidden");
    target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((n) => {
      n.classList.toggle("active", n.dataset.page === tabName);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (tabName === "reports") updateAnalytics();
    if (tabName === "settings") updateDataStatus();
  }

  /* ---------- Laporan & Grafik ---------- */
  let expenseChart = null;

  function isInCurrentMonth(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  function updateAnalytics() {
    const all = getTransactions();
    const monthly = all.filter((t) => isInCurrentMonth(t.date));

    const monthIncome = monthly
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthly
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

    $("monthIncome").textContent = formatIDR(monthIncome);
    $("monthExpense").textContent = formatIDR(monthExpense);
    $("monthBalance").textContent = formatIDR(monthIncome - monthExpense);

    $("reportPeriod").textContent =
      "Periode: " +
      new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

    const dayOfMonth = new Date().getDate();
    const avg = dayOfMonth > 0 ? Math.round(monthExpense / dayOfMonth) : 0;
    $("avgDaily").textContent = "Rp " + formatIDR(avg);
    $("txCount").textContent = monthly.length;

    const byCat = {};
    monthly
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
      });

    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    $("topCategory").textContent = sorted[0]
      ? `${sorted[0][0]} (Rp ${formatIDR(sorted[0][1])})`
      : "-";

    renderCharts(sorted);
    renderCategoryBreakdown(sorted, monthExpense);
  }

  function renderCharts(catData) {
    const canvas = $("expenseChart");
    const emptyMsg = $("chartEmpty");

    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }

    if (catData.length === 0) {
      canvas.style.display = "none";
      emptyMsg.style.display = "block";
      return;
    }

    emptyMsg.style.display = "none";
    canvas.style.display = "block";

    if (typeof Chart === "undefined") {
      emptyMsg.textContent = "Chart.js tidak dapat dimuat (periksa koneksi).";
      emptyMsg.style.display = "block";
      return;
    }

    const labels = catData.map(([name]) => name);
    const values = catData.map(([, val]) => val);
    const colors = catData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

    expenseChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: "rgba(255,255,255,0.15)",
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: Rp ${formatIDR(ctx.parsed)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function renderCategoryBreakdown(catData, total) {
    const el = $("categoryBreakdown");
    if (catData.length === 0) {
      el.innerHTML = "";
      return;
    }

    el.innerHTML = catData
      .map(([name, val]) => {
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return `
          <div>
            <div class="mb-1 flex items-center justify-between text-xs">
              <span class="font-semibold">${escapeHTML(name)}</span>
              <span class="text-white/60">${pct}% • Rp ${formatIDR(val)}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /* ---------- Status data (tab Pengaturan) ---------- */
  function updateDataStatus() {
    const tx = getTransactions();
    const cats = getCategories();
    $("statTx").textContent = tx.length;
    $("statCat").textContent = cats.length;

    let bytes = 0;
    try {
      bytes =
        (localStorage.getItem(STORAGE_KEY) || "").length +
        (localStorage.getItem(CATEGORIES_KEY) || "").length;
    } catch {
      /* ignore */
    }
    $("statStorage").textContent = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  /* ---------- Reset data (konfirmasi ganda) ---------- */
  function resetAllData() {
    if (!confirm("Hapus seluruh data Vaulty?")) return;
    if (!confirm("Tindakan ini tidak dapat dibatalkan. Lanjutkan?")) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CATEGORIES_KEY);

    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }

    populateCategoryDropdowns();
    updateSummary();
    renderHomeTransactions();
    renderTransactions();
    updateDataStatus();
    showToast("Semua data telah dihapus");
  }

  /* ---------- Tema tampilan dinamis ---------- */
  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = "magenta";
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll(".theme-option").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeValue === theme);
    });
  }

  /* ---------- Ekspor data (JSON) ---------- */
  function exportData() {
    const payload = {
      app: "Vaulty",
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: getTransactions(),
      categories: getCategories(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaulty-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Data berhasil diekspor");
  }

  /* ---------- Impor data (JSON) ---------- */
  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);

        if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.categories)) {
          throw new Error("Format file tidak valid");
        }

        const txOk = data.transactions.every(
          (t) =>
            t &&
            typeof t.amount === "number" &&
            typeof t.type === "string" &&
            typeof t.date === "string" &&
            typeof t.category === "string"
        );
        const catOk = data.categories.every(
          (c) => c && typeof c.name === "string"
        );

        if (!txOk || !catOk) throw new Error("Isi file tidak valid");

        if (!confirm("Impor akan menimpa data yang ada saat ini. Lanjutkan?")) return;

        saveTransactions(data.transactions);
        saveCategories(data.categories);

        if (expenseChart) {
          expenseChart.destroy();
          expenseChart = null;
        }

        populateCategoryDropdowns();
        updateSummary();
        renderHomeTransactions();
        renderTransactions();
        updateDataStatus();
        if (!$("view-reports").classList.contains("hidden")) updateAnalytics();
        showToast("Impor data berhasil");
      } catch (err) {
        showToast("Gagal impor: " + err.message);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Header tanggal (ringkas) ---------- */
  $("currentDate").textContent = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* ---------- Events: buka modal ---------- */
  $("btnAddTransaction").addEventListener("click", openModal);
  $("btnFloatingAdd").addEventListener("click", openModal);
  $("btnAddCategory").addEventListener("click", openCatModal);

  /* ---------- Events: tutup modal transaksi ---------- */
  $("btnCloseModal").addEventListener("click", closeModal);
  $("btnCancelModal").addEventListener("click", closeModal);
  txModal.addEventListener("click", (e) => {
    if (e.target === txModal) closeModal();
  });

  /* ---------- Events: tutup modal kategori ---------- */
  $("btnCloseCatModal").addEventListener("click", closeCatModal);
  $("btnCancelCatModal").addEventListener("click", closeCatModal);
  catModal.addEventListener("click", (e) => {
    if (e.target === catModal) closeCatModal();
  });

  /* ---------- Toggle jenis transaksi ---------- */
  $("txModal")
    .querySelectorAll(".type-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => setType(btn.dataset.type));
    });

  /* ---------- Toggle jenis kategori ---------- */
  document.querySelectorAll(".cat-type").forEach((btn) => {
    btn.addEventListener("click", () => setCatType(btn.dataset.cattype));
  });

  /* ---------- Submit transaksi ---------- */
  $("txForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const type = $("txModal").querySelector(".type-btn.active")?.dataset.type || "expense";
    const amount = Number($("txAmount").value);
    const category = $("txCategory").value;
    const date = $("txDate").value;
    const note = $("txNote").value.trim();

    resetValidation();
    let valid = true;

    if (!amount || amount <= 0) {
      $("amountError").classList.remove("hidden");
      valid = false;
    }
    if (!date) {
      $("dateError").classList.remove("hidden");
      valid = false;
    }
    if (!valid) return;

    const payload = { type, amount, category, date, note: note || category };

    if (editingTxId) {
      updateTransaction(editingTxId, payload);
      editingTxId = null;
      closeModal();
      updateSummary();
      renderHomeTransactions();
      renderTransactions();
      updateDataStatus();
      if (!$("view-reports").classList.contains("hidden")) updateAnalytics();
      showToast("Transaksi berhasil diperbarui");
    } else {
      addTransaction(payload);
      closeModal();
      updateSummary();
      renderHomeTransactions();
      renderTransactions();
      updateDataStatus();
      if (!$("view-reports").classList.contains("hidden")) updateAnalytics();
      showToast("Transaksi berhasil disimpan");
    }
  });

  /* ---------- Submit kategori ---------- */
  $("catForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("catName").value.trim();
    const catType = document.querySelector(".cat-type.active")?.dataset.cattype || "both";
    const icon = $("catIcon").value || "fa-solid fa-tag";

    if (!name) {
      $("catNameError").classList.remove("hidden");
      return;
    }

    const duplicate = getCategories().some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      showToast("Kategori tersebut sudah ada");
      return;
    }

    saveCategory({ name, type: catType, icon });
    closeCatModal();
    populateCategoryDropdowns();
    showToast("Kategori berhasil ditambahkan");
  });

  /* ---------- Pencarian & filter (real-time) ---------- */
  ["searchInput", "filterType", "filterCategory"].forEach((id) => {
    $(id).addEventListener("input", renderTransactions);
    $(id).addEventListener("change", renderTransactions);
  });

  /* ---------- Navigasi tab (Bottom Navigation) ---------- */
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchTab(item.dataset.page));
  });

  $("btnSeeAll").addEventListener("click", () => switchTab("transactions"));

  /* ---------- Reset data ---------- */
  $("btnResetData").addEventListener("click", resetAllData);

  /* ---------- Pilih tema ---------- */
  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyTheme(btn.dataset.themeValue);
      showToast("Tema tampilan diperbarui");
    });
  });

  /* ---------- Ekspor & impor data ---------- */
  $("btnExportData").addEventListener("click", exportData);
  $("btnImportData").addEventListener("click", () => $("importFileInput").click());
  $("importFileInput").addEventListener("change", importData);

  /* ---------- Toast helper ---------- */
  function showToast(message) {
    const existing = document.getElementById("vaulty-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "vaulty-toast";
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 110px;
      transform: translateX(-50%);
      z-index: 999;
      padding: 12px 20px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.15);
      -webkit-backdrop-filter: blur(18px);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 90vw;
      white-space: normal;
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
  }

  /* ---------- Init ---------- */
  applyTheme(localStorage.getItem(THEME_KEY) || "magenta");
  populateCategoryDropdowns();
  renderIconPicker();
  updateSummary();
  renderHomeTransactions();
  renderTransactions();
  switchTab("home");
});
