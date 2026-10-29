const STORAGE_KEY = "aegis_tasks_v1";
const MAX_TASKS = 5;

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let activeTimer = null;
let remainingSeconds = 0;

function sanitize(str) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  renderTasks();
}

function updateBadge() {
  const badge = document.getElementById("taskQuotaBadge");
  badge.textContent = `${tasks.length} / ${MAX_TASKS} Tasks`;
  const addBtn = document.getElementById("addBtn");
  
  if (tasks.length >= MAX_TASKS) {
    addBtn.disabled = true;
    addBtn.textContent = "Quota Reached (Max 5 Tasks)";
    addBtn.style.opacity = "0.5";
    addBtn.style.cursor = "not-allowed";
  } else {
    addBtn.disabled = false;
    addBtn.textContent = "+ Lock In Task";
    addBtn.style.opacity = "1";
    addBtn.style.cursor = "pointer";
  }
}

function renderTasks() {
  const container = document.getElementById("taskList");
  container.innerHTML = "";
  updateBadge();

  if (tasks.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No tasks locked in yet. Add up to 5 objectives above.</p>`;
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";

    const bgDiv = document.createElement("div");
    bgDiv.className = "task-bg";
    if (task.image) {
      bgDiv.style.backgroundImage = `url(${task.image})`;
    }

    item.appendChild(bgDiv);

    item.innerHTML += `
      <div class="task-body">
        <span class="task-title ${task.completed ? "done" : ""}">${sanitize(task.title)}</span>
        <input type="checkbox" ${task.completed ? "checked" : ""} data-id="${task.id}" class="task-checkbox">
      </div>
      <div class="task-meta">
        <div>
          <span>⏱ ${task.duration} min</span>
          <span class="policy-badge" style="margin-left: 0.5rem;">
            ${task.policy === "block" ? "🚫 Zen Focus" : "📱 Phone OK"}
          </span>
        </div>
        <div class="task-actions">
          ${task.policy === "block" && !task.completed ? `<button class="action-btn start-focus-btn" data-id="${task.id}">Enter Zen</button>` : ""}
          <button class="action-btn delete-btn" data-id="${task.id}">✕</button>
        </div>
      </div>
    `;

    container.appendChild(item);
  });

  attachListeners();
}

function attachListeners() {
  document.querySelectorAll(".task-checkbox").forEach((box) => {
    box.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const target = tasks.find((t) => t.id === id);
      if (target) {
        target.completed = e.target.checked;
        saveTasks();
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
    });
  });

  document.querySelectorAll(".start-focus-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const target = tasks.find((t) => t.id === id);
      if (target) startZenMode(target);
    });
  });
}

function startZenMode(task) {
  const overlay = document.getElementById("focusOverlay");
  const taskTitle = document.getElementById("focusTaskTitle");
  const backdrop = document.getElementById("focusBackdrop");
  const timerDisplay = document.getElementById("timerDisplay");

  taskTitle.textContent = task.title;
  backdrop.style.backgroundImage = task.image ? `url(${task.image})` : "none";

  remainingSeconds = task.duration * 60;
  overlay.classList.remove("hidden");

  clearInterval(activeTimer);
  updateTimerUI(timerDisplay);

  activeTimer = setInterval(() => {
    remainingSeconds--;
    updateTimerUI(timerDisplay);
    if (remainingSeconds <= 0) {
      clearInterval(activeTimer);
      alert(`Session Completed: ${task.title}`);
      task.completed = true;
      saveTasks();
      overlay.classList.add("hidden");
    }
  }, 1000);

  document.getElementById("completeFocusBtn").onclick = () => {
    clearInterval(activeTimer);
    task.completed = true;
    saveTasks();
    overlay.classList.add("hidden");
  };

  document.getElementById("exitFocusBtn").onclick = () => {
    clearInterval(activeTimer);
    overlay.classList.add("hidden");
  };
}

function updateTimerUI(element) {
  const m = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
  const s = (remainingSeconds % 60).toString().padStart(2, "0");
  element.textContent = `${m}:${s}`;
}

document.getElementById("taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (tasks.length >= MAX_TASKS) {
    alert("You have reached the maximum 5-task allocation.");
    return;
  }

  const titleInput = document.getElementById("taskTitle");
  const durationInput = document.getElementById("taskDuration");
  const policyInput = document.getElementById("phonePolicy");
  const imageInput = document.getElementById("taskImage");

  let base64Image = null;
  if (imageInput.files[0]) {
    base64Image = await readFileAsBase64(imageInput.files[0]);
  }

  const newTask = {
    id: "task_" + Date.now(),
    title: titleInput.value.trim(),
    duration: parseInt(durationInput.value, 10),
    policy: policyInput.value,
    image: base64Image,
    completed: false
  };

  tasks.push(newTask);
  saveTasks();

  titleInput.value = "";
  durationInput.value = "";
  imageInput.value = "";
  policyInput.value = "allow";
});

renderTasks();