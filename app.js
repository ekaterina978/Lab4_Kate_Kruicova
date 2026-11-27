(function () {
  "use strict";

  const STORAGE_KEY = "readingList.items";
  const FILTER_KEY = "readingList.filter";
  const DRAFT_KEY = "readingList.draft";

  const FILTERS = ["all", "unread", "read"];

  // ---------- Состояние ----------
  let records = [];
  let currentFilter = "all";

  // ---------- DOM ----------
  const form = document.getElementById("add-form");
  const input = document.getElementById("title-input");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const warningEl = document.getElementById("warning");
  const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));

  // ---------- Утилиты ----------
  function showWarning(message) {
    warningEl.textContent = message;
    warningEl.hidden = false;
  }

  function hideWarning() {
    warningEl.hidden = true;
    warningEl.textContent = "";
  }

  function isValidRecord(r) {
    return (
      r !== null &&
      typeof r === "object" &&
      typeof r.id === "string" &&
      r.id.length > 0 &&
      typeof r.title === "string" &&
      r.title.trim().length > 0 &&
      (r.status === "unread" || r.status === "read")
    );
  }

  function createId() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  // ---------- localStorage ----------
  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("Не удалось сохранить список:", err);
      showWarning("Не удалось сохранить данные в localStorage. Продолжаем работу в памяти.");
    }
  }

  function loadRecords() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.error("Не удалось прочитать localStorage:", err);
      showWarning("Не удалось прочитать сохранённый список. Открыт пустой список.");
      return [];
    }

    if (raw === null) return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("Повреждённый JSON в localStorage:", err);
      showWarning("Сохранённый список повреждён (неверный JSON). Открыт пустой список.");
      return [];
    }

    if (!Array.isArray(parsed) || !parsed.every(isValidRecord)) {
      console.error("Некорректная структура списка:", parsed);
      showWarning("Сохранённый список повреждён (неверные поля записей). Открыт пустой список.");
      return [];
    }

    return parsed;
  }

  function saveFilter() {
    try {
      localStorage.setItem(FILTER_KEY, currentFilter);
    } catch (err) {
      console.error("Не удалось сохранить фильтр:", err);
      showWarning("Не удалось сохранить выбранный фильтр. Продолжаем работу в памяти.");
    }
  }

  function loadFilter() {
    let raw;
    try {
      raw = localStorage.getItem(FILTER_KEY);
    } catch (err) {
      console.error("Не удалось прочитать фильтр:", err);
      return "all";
    }
    return FILTERS.includes(raw) ? raw : "all";
  }

  // ---------- sessionStorage (черновик) ----------
  function saveDraft(value) {
    try {
      if (value.trim() === "") {
        sessionStorage.removeItem(DRAFT_KEY);
      } else {
        sessionStorage.setItem(DRAFT_KEY, value);
      }
    } catch (err) {
      console.error("Не удалось сохранить черновик:", err);
    }
  }

  function loadDraft() {
    try {
      return sessionStorage.getItem(DRAFT_KEY) || "";
    } catch (err) {
      console.error("Не удалось прочитать черновик:", err);
      return "";
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error("Не удалось удалить черновик:", err);
    }
  }

  // ---------- Отрисовка ----------
  function getVisibleRecords() {
    if (currentFilter === "unread") {
      return records.filter((r) => r.status === "unread");
    }
    if (currentFilter === "read") {
      return records.filter((r) => r.status === "read");
    }
    return records;
  }

  function renderFilters() {
    filterButtons.forEach((btn) => {
      const isActive = btn.dataset.filter === currentFilter;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderList() {
    const visible = getVisibleRecords();
    listEl.textContent = ""; // очистка через DOM, без innerHTML

    visible.forEach((record) => {
      const li = document.createElement("li");
      li.className = "item" + (record.status === "read" ? " done" : "");
      li.dataset.id = record.id;

      const title = document.createElement("span");
      title.className = "item-title";
      title.textContent = record.title; // безопасный вывод

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "toggle-btn";
      toggleBtn.textContent = record.status === "read" ? "Прочитано" : "К прочтению";
      toggleBtn.title = "Переключить статус";
      toggleBtn.addEventListener("click", () => toggleStatus(record.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Удалить";
      deleteBtn.addEventListener("click", () => deleteRecord(record.id));

      li.append(title, toggleBtn, deleteBtn);
      listEl.appendChild(li);
    });

    emptyEl.hidden = visible.length > 0;
  }

  function render() {
    renderFilters();
    renderList();
  }

  // ---------- Действия ----------
  function addRecord(rawTitle) {
    const title = rawTitle.trim();
    if (title === "") {
      // отклоняем пустой ввод
      return false;
    }

    records.push({
      id: createId(),
      title: title,
      status: "unread",
    });

    saveRecords();
    hideWarning();
    render();
    return true;
  }

  function toggleStatus(id) {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    record.status = record.status === "read" ? "unread" : "read";
    saveRecords();
    render();
  }

  function deleteRecord(id) {
    records = records.filter((r) => r.id !== id);
    saveRecords();
    render();
  }

  function setFilter(filter) {
    if (!FILTERS.includes(filter)) return;
    currentFilter = filter;
    saveFilter();
    render();
  }

  // ---------- События ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const added = addRecord(input.value);
    if (added) {
      input.value = "";
      clearDraft(); // removeItem()
      input.focus();
    }
  });

  input.addEventListener("input", () => {
    saveDraft(input.value);
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
  });

  // ---------- Инициализация ----------
  function init() {
    records = loadRecords();
    currentFilter = loadFilter();

    const draft = loadDraft();
    if (draft) {
      input.value = draft;
    }

    render();
  }

  init();
})();