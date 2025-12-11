(function(){
  const storageKey = 'todo_tasks_v1';
  const newTaskInput = document.getElementById('newTask');
  const addBtn = document.getElementById('addBtn');
  const listEl = document.getElementById('todoList');
  const emptyState = document.getElementById('emptyState');
  const remainingEl = document.getElementById('remaining');
  const filters = document.querySelectorAll('.filter-btn');
  const toggleAll = document.getElementById('toggleAll');
  const clearCompletedBtn = document.getElementById('clearCompleted');

  let tasks = [];
  let filter = 'all';

  function uid(){return Date.now().toString(36) + Math.random().toString(36).slice(2,8)}
  function save(){ localStorage.setItem(storageKey, JSON.stringify(tasks)) }
  function load(){ tasks = JSON.parse(localStorage.getItem(storageKey) || '[]') }

  // Normalize text for comparing duplicates (trim, collapse spaces, lowercase)
  function normalizeTaskText(s){
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // ----------------------------
  // ✅ VALIDATION (ADD NEW TASK)
  // ----------------------------
  function validateNewTask(text){
    const normalized = normalizeTaskText(text);

    if(!normalized){
      newTaskInput.setCustomValidity('Please enter a task.');
      newTaskInput.reportValidity();
      return false;
    }

    const exists = tasks.some(t => normalizeTaskText(t.text) === normalized);
    if(exists){
      newTaskInput.setCustomValidity('This task already exists.');
      newTaskInput.reportValidity();
      return false;
    }

    newTaskInput.setCustomValidity('');
    return true;
  }

  // Clear validation on typing
  newTaskInput.addEventListener('input', () => newTaskInput.setCustomValidity(''));


  function render(){
    const visible = tasks.filter(t => filter==='all' || (filter==='active'&&!t.done) || (filter==='completed'&&t.done));
    listEl.innerHTML = '';
    emptyState.hidden = visible.length > 0;

    visible.forEach(t => {
      const li = document.createElement('li'); 
      li.className = 'item'; 
      li.dataset.id = t.id;

      const left = document.createElement('div'); 
      left.className = 'left';

      const cb = document.createElement('button');
      cb.className = 'checkbox' + (t.done? ' checked':'');
      cb.setAttribute('aria-pressed', String(!!t.done));
      cb.title = t.done? 'Mark as not done' : 'Mark as done';
      cb.addEventListener('click', () => toggleDone(t.id));

      const taskSpan = document.createElement('span');
      taskSpan.className = 'task' + (t.done? ' completed':'');
      taskSpan.textContent = t.text;
      taskSpan.tabIndex = 0;

      // only editable if not done
      if (!t.done) {
        taskSpan.addEventListener('dblclick', () => startEdit(t.id, taskSpan));
        taskSpan.addEventListener('keydown', (e)=>{ if(e.key==='Enter') startEdit(t.id, taskSpan); });
      }

      left.appendChild(cb); 
      left.appendChild(taskSpan);

      const actions = document.createElement('div'); 
      actions.className = 'actions';

      const editBtn = document.createElement('button'); 
      editBtn.className = 'icon-btn'; 
      editBtn.title = t.done ? 'Cannot edit completed task' : 'Edit'; 
      editBtn.innerHTML = '✎';
      if(t.done){ editBtn.disabled = true; }
      editBtn.addEventListener('click', ()=> { if(!t.done) startEdit(t.id, taskSpan); });

      const delBtn = document.createElement('button'); 
      delBtn.className = 'icon-btn'; 
      delBtn.title = 'Delete'; 
      delBtn.innerHTML = '🗑';
      delBtn.addEventListener('click', ()=> removeTask(t.id));

      actions.appendChild(editBtn); 
      actions.appendChild(delBtn);

      li.appendChild(left); 
      li.appendChild(actions);

      listEl.appendChild(li);
    });

    const remaining = tasks.filter(t=>!t.done).length;
    remainingEl.textContent = remaining;
    toggleAll.checked = tasks.length > 0 && remaining === 0;
  }

  // -------------------
  // ADD TASK (validated)
  // -------------------
  function addTask(text){
    if(!validateNewTask(text)) return;

    const trimmed = text.replace(/\s+/g, ' ').trim();
    tasks.unshift({id:uid(), text:trimmed, done:false, createdAt:Date.now()});
    save(); render();
  }

  function removeTask(id){ tasks = tasks.filter(t=>t.id !== id); save(); render(); }
  function toggleDone(id){ tasks = tasks.map(t=>t.id===id? {...t, done:!t.done}:t); save(); render(); }

  // ---------------------------------------------
  // ✅ VALIDATION INSIDE EDIT MODE
  // Prevent: empty text, duplicate text
  // ---------------------------------------------
  function startEdit(id, taskSpan){
    const task = tasks.find(t=>t.id===id);
    if(!task || task.done) return;

    const input = document.createElement('input'); 
    input.type='text'; 
    input.value=task.text; 
    input.style.width='100%';

    taskSpan.replaceWith(input); 
    input.focus(); 
    input.setSelectionRange(input.value.length,input.value.length);

    input.addEventListener('input', () => input.setCustomValidity(''));

    function commit(){
      const val = input.value.replace(/\s+/g, ' ').trim();
      const normalized = normalizeTaskText(val);

      if(!normalized){
        input.setCustomValidity("Task cannot be empty.");
        input.reportValidity();
        input.focus();
        return;
      }

      const exists = tasks.some(t => t.id !== id && normalizeTaskText(t.text) === normalized);
      if(exists){
        input.setCustomValidity("A task with this name already exists.");
        input.reportValidity();
        input.focus();
        return;
      }

      task.text = val;
      save(); render();
    }

    function cancel(){ render(); }

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e)=>{ 
      if(e.key==='Enter') commit(); 
      if(e.key==='Escape') cancel(); 
    });
  }

  function setFilter(newFilter){
    filter = newFilter;
    filters.forEach(f => {
      const is = f.dataset.filter === filter;
      f.classList.toggle('active', is);
      f.setAttribute('aria-selected', String(is));
    });
    render();
  }

  toggleAll.addEventListener('change', ()=>{
    const markDone = tasks.some(t=>!t.done);
    tasks = tasks.map(t=> ({...t, done: markDone}));
    save(); render();
  });

  clearCompletedBtn.addEventListener('click', ()=>{ 
    tasks = tasks.filter(t=>!t.done); 
    save(); render(); 
  });

  addBtn.addEventListener('click', ()=>{
    addTask(newTaskInput.value); 
    newTaskInput.value=''; 
    newTaskInput.focus(); 
  });

  newTaskInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      addTask(newTaskInput.value);
      newTaskInput.value='';
    }
  });

  filters.forEach(b => b.addEventListener('click', ()=> setFilter(b.dataset.filter)));

  load(); 
  render();
})();
