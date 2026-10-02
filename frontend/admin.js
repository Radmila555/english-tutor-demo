const tableBody = document.querySelector("#applicationsTableBody");
const emptyState = document.querySelector("#adminEmptyState");
const adminMessage = document.querySelector("#adminMessage");
const filterButtons = Array.from(document.querySelectorAll(".filter-button"));

const statusLabels = {
  new: "новая",
  contact: "связаться",
  done: "обработана",
};

let applications = [];
let activeFilter = "all";
let readOnly = true;

function getApiUrl(path) {
  return new URL(path, location.origin).toString();
}

function setAdminMessage(text, type = "") {
  adminMessage.textContent = text;
  adminMessage.classList.remove("is-error", "is-success");

  if (type) {
    adminMessage.classList.add(`is-${type}`);
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "—";
  return cell;
}

function createStatusSelect(application) {
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Статус заявки ${application.id}`);

  Object.entries(statusLabels).forEach(([status, label]) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = label;
    option.selected = application.status === status;
    select.append(option);
  });

  select.addEventListener("change", () => updateApplicationStatus(application.id, select.value, select));

  return select;
}

function getVisibleApplications() {
  if (activeFilter === "all") {
    return applications;
  }

  return applications.filter((application) => application.status === activeFilter);
}

function renderApplications() {
  const visibleApplications = getVisibleApplications();
  tableBody.replaceChildren();

  visibleApplications.forEach((application) => {
    const row = document.createElement("tr");

    row.append(
      createCell(String(application.id)),
      createCell(formatDate(application.created_at)),
      createCell(application.name),
      createCell(application.contact),
      createCell(application.level),
      createCell(application.goal),
      createCell(application.difficulty),
      createCell(application.preferred_time)
    );

    const statusCell = document.createElement("td");
    if (readOnly) statusCell.textContent = statusLabels[application.status] || "—";
    else statusCell.append(createStatusSelect(application));
    row.append(statusCell);
    tableBody.append(row);
  });

  emptyState.hidden = visibleApplications.length > 0;
}

async function loadApplications() {
  setAdminMessage("Загружаем заявки...");

  try {
    const response = await fetch(getApiUrl("/api/applications"), {
      credentials: "same-origin",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Не удалось загрузить заявки.");
    }

    readOnly = result.readOnly === true;
    document.querySelector("#adminDescription").textContent = readOnly
      ? "Демо-панель · Только просмотр"
      : "Заявки из локальной базы. Статус можно изменить прямо в таблице.";
    applications = result.applications || [];
    setAdminMessage(applications.length ? "" : "Пока нет заявок.");
    renderApplications();
  } catch (error) {
    setAdminMessage(error.message || "Не удалось загрузить заявки.", "error");
  }
}

async function updateApplicationStatus(id, status, select) {
  if (readOnly) return;
  const previousStatus = applications.find((application) => application.id === id)?.status;
  select.disabled = true;
  setAdminMessage("");

  try {
    const response = await fetch(getApiUrl(`/api/applications/${id}/status`), {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.error || "Не удалось изменить статус.");
    }

    applications = applications.map((application) =>
      application.id === id ? result.application : application
    );
    setAdminMessage("Статус обновлён.", "success");
    renderApplications();
  } catch (error) {
    select.value = previousStatus;
    setAdminMessage(error.message || "Не удалось изменить статус.", "error");
  } finally {
    select.disabled = false;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    renderApplications();
  });
});

loadApplications();
