const STORAGE_KEY = "taskmate_assignments_v1";
const $ = (selector) => document.querySelector(selector);

const listEl = $("#assignment-list");
const emptyEl = $("#empty-state");
const dialog = $("#assignment-dialog");
const form = $("#assignment-form");
const toast = $("#toast");

let activeView = "all";
let toastTimer;
let assignments = loadAssignments();

function dateOffset(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function loadAssignments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not read saved assignments:", error);
  }
  const demo = [
    {id: crypto.randomUUID(), title:"Build a responsive landing page", subject:"Web Technologies", description:"Use semantic HTML, CSS Flexbox and a mobile-friendly layout.", dueDate:dateOffset(2), priority:"High", status:"In Progress", createdAt:Date.now()-4000},
    {id: crypto.randomUUID(), title:"Practice array and string problems", subject:"Data Structures", description:"Solve five practice problems and write their time complexities.", dueDate:dateOffset(4), priority:"Medium", status:"Pending", createdAt:Date.now()-3000},
    {id: crypto.randomUUID(), title:"Prepare normalization notes", subject:"DBMS", description:"Revise 1NF, 2NF, 3NF and BCNF with examples.", dueDate:dateOffset(-2), priority:"High", status:"Pending", createdAt:Date.now()-2000},
    {id: crypto.randomUUID(), title:"Submit machine learning worksheet", subject:"Machine Learning", description:"Complete the worksheet and check all answers.", dueDate:dateOffset(-1), priority:"Low", status:"Completed", createdAt:Date.now()-1000}
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
  return demo;
}

function saveAssignments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch (error) {
    showToast("Could not save data. Check browser storage settings.");
  }
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isOverdue(item) {
  return item.status !== "Completed" && item.dueDate < todayString();
}

function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}

function updateStats() {
  const total = assignments.length;
  const completed = assignments.filter(a => a.status === "Completed").length;
  const pending = assignments.filter(a => a.status !== "Completed").length;
  const overdue = assignments.filter(isOverdue).length;
  const progress = total ? Math.round(completed / total * 100) : 0;
  $("#total-count").textContent = total;
  $("#pending-count").textContent = pending;
  $("#completed-count").textContent = completed;
  $("#overdue-count").textContent = overdue;
  $("#progress-text").textContent = `${progress}%`;
  $("#progress-bar").style.width = `${progress}%`;
}

function visibleAssignments() {
  const query = $("#search-input").value.trim().toLowerCase();
  const priority = $("#priority-filter").value;
  const sort = $("#sort-select").value;
  let result = assignments.filter(item => {
    const matchesText = `${item.title} ${item.subject} ${item.description}`.toLowerCase().includes(query);
    const matchesPriority = priority === "all" || item.priority === priority;
    let matchesView = true;
    if (activeView === "pending") matchesView = item.status !== "Completed";
    if (activeView === "completed") matchesView = item.status === "Completed";
    if (activeView === "overdue") matchesView = isOverdue(item);
    return matchesText && matchesPriority && matchesView;
  });
  const rank = {High:3, Medium:2, Low:1};
  result.sort((a,b) => {
    if (sort === "due-desc") return b.dueDate.localeCompare(a.dueDate);
    if (sort === "priority") return rank[b.priority]-rank[a.priority] || a.dueDate.localeCompare(b.dueDate);
    if (sort === "created") return b.createdAt-a.createdAt;
    return a.dueDate.localeCompare(b.dueDate);
  });
  return result;
}

function renderAssignments() {
  const items = visibleAssignments();
  listEl.innerHTML = items.map(item => {
    const overdue = isOverdue(item);
    const statusClass = item.status === "Completed" ? "status-completed" : item.status === "In Progress" ? "status-progress" : overdue ? "status-overdue" : "status-pending";
    const statusText = overdue ? "Overdue" : item.status;
    const priorityClass = `priority-${item.priority.toLowerCase()}`;
    return `
      <article class="assignment-card ${item.status === "Completed" ? "is-completed" : ""}">
        <button class="check-button ${item.status === "Completed" ? "done" : ""}" data-action="toggle" data-id="${item.id}" aria-label="${item.status === "Completed" ? "Mark incomplete" : "Mark complete"}">${item.status === "Completed" ? "✓" : ""}</button>
        <div class="assignment-main">
          <div class="assignment-title-row"><h3 class="assignment-title">${escapeHTML(item.title)}</h3><span class="priority-pill ${priorityClass}">${escapeHTML(item.priority)} priority</span></div>
          <div class="assignment-meta"><span class="subject-pill">${escapeHTML(item.subject)}</span><span class="status-pill ${statusClass}">${escapeHTML(statusText)}</span><span class="due-text ${overdue ? "overdue" : ""}">Due ${formatDate(item.dueDate)}</span></div>
          ${item.description ? `<p class="assignment-meta">${escapeHTML(item.description)}</p>` : ""}
        </div>
        <div class="card-actions"><button class="icon-btn" data-action="edit" data-id="${item.id}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">✎</button><button class="icon-btn" data-action="delete" data-id="${item.id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">⌫</button></div>
      </article>`;
  }).join("");
  emptyEl.classList.toggle("hidden", items.length !== 0);
  listEl.classList.toggle("hidden", items.length === 0);
  updateStats();
  const labels = {all:["All assignments","A clear view of everything you need to do."],pending:["Pending assignments","Keep moving your unfinished work forward."],completed:["Completed assignments","Look at everything you have accomplished."],overdue:["Overdue assignments","These tasks have passed their due date."]};
  $("#list-heading").textContent = labels[activeView][0];
  $("#list-subtitle").textContent = labels[activeView][1];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function openForm(item=null) {
  form.reset();
  $("#form-error").classList.add("hidden");
  $("#assignment-id").value = item ? item.id : "";
  $("#dialog-title").textContent = item ? "Edit assignment" : "Add assignment";
  $("#title").value = item?.title || "";
  $("#subject").value = item?.subject || "";
  $("#due-date").value = item?.dueDate || "";
  $("#priority").value = item?.priority || "Medium";
  $("#status").value = item?.status || "Pending";
  $("#description").value = item?.description || "";
  dialog.showModal();
  $("#title").focus();
}

function closeForm() {
  dialog.close();
}

function handleSubmit(event) {
  event.preventDefault();
  const id = $("#assignment-id").value;
  const title = $("#title").value.trim();
  const subject = $("#subject").value.trim();
  const dueDate = $("#due-date").value;
  if (!title || !subject || !dueDate) {
    $("#form-error").textContent = "Please fill in the title, subject, and due date.";
    $("#form-error").classList.remove("hidden");
    return;
  }
  const oldItem = assignments.find(item => item.id === id);
  const item = {
    id: id || crypto.randomUUID(), title, subject, dueDate,
    priority: $("#priority").value, status: $("#status").value,
    description: $("#description").value.trim(),
    createdAt: oldItem ? oldItem.createdAt : Date.now()
  };
  if (oldItem) {
    assignments = assignments.map(existing => existing.id === id ? item : existing);
    showToast("Assignment updated.");
  } else {
    assignments.unshift(item);
    showToast("Assignment added.");
  }
  saveAssignments();
  closeForm();
  renderAssignments();
}

function handleListAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const {action, id} = button.dataset;
  const item = assignments.find(a => a.id === id);
  if (!item) return;
  if (action === "toggle") {
    item.status = item.status === "Completed" ? "Pending" : "Completed";
    saveAssignments(); renderAssignments();
    showToast(item.status === "Completed" ? "Nice work — assignment completed!" : "Assignment moved back to pending.");
  } else if (action === "edit") {
    openForm(item);
  } else if (action === "delete") {
    if (confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      assignments = assignments.filter(a => a.id !== id);
      saveAssignments(); renderAssignments(); showToast("Assignment deleted.");
    }
  }
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
    renderAssignments();
  });
});
$("#add-assignment-btn").addEventListener("click", () => openForm());
$("#empty-add-btn").addEventListener("click", () => openForm());
$("#close-dialog").addEventListener("click", closeForm);
$("#cancel-dialog").addEventListener("click", closeForm);
form.addEventListener("submit", handleSubmit);
listEl.addEventListener("click", handleListAction);
$("#search-input").addEventListener("input", renderAssignments);
$("#priority-filter").addEventListener("change", renderAssignments);
$("#sort-select").addEventListener("change", renderAssignments);
dialog.addEventListener("click", event => { if (event.target === dialog) closeForm(); });

$("#today-label").textContent = new Date().toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"}).toUpperCase();
renderAssignments();
