// app.js

/***************************************************
 * DATA & STRUCTURE
 ***************************************************/
class Course {
  constructor(id, name, day, time, room) {
    this.id = id;
    this.name = name;
    this.day = day;
    this.time = time;
    this.room = room;
    this.meetings = []; // Daftar pertemuan
  }
}

class Meeting {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.notes = []; // Daftar Cornell notes
  }
}

class CornellNote {
  constructor(id, keypoints, note, summary) {
    this.id = id;
    this.keypoints = keypoints;
    this.note = note;
    this.summary = summary;
  }
}

/***************************************************
 * STORAGE FUNCTIONS (LOCALSTORAGE)
 ***************************************************/
const getCourses = () => {
  const data = localStorage.getItem("courses");
  return data ? JSON.parse(data) : [];
};

const saveCourses = (courses) => {
  localStorage.setItem("courses", JSON.stringify(courses));
};

/***************************************************
 * VIEW NAVIGATION (SINGLE PAGE LOGIC)
 ***************************************************/
const scheduleView = document.getElementById("schedule-view");
const meetingsView = document.getElementById("meetings-view");
const meetingDetailView = document.getElementById("meeting-detail-view");

/** Tunjukkan salah satu view, sembunyikan lainnya */
function showView(viewId) {
  // Tutup semua section
  [scheduleView, meetingsView, meetingDetailView].forEach(section => {
    section.style.display = "none";
  });
  // Tampilkan view yang dipilih
  document.getElementById(viewId).style.display = "block";
}

/***************************************************
 * 1. SCHEDULE VIEW
 ***************************************************/
// Elemen untuk form & grid
const courseIdInput = document.getElementById("course-id");
const courseNameInput = document.getElementById("course-name");
const courseDayInput = document.getElementById("course-day");
const courseTimeInput = document.getElementById("course-time");
const courseRoomInput = document.getElementById("course-room");

const saveCourseBtn = document.getElementById("save-course-btn");
const cancelEditCourseBtn = document.getElementById("cancel-edit-course-btn");
const scheduleGrid = document.querySelector(".schedule-grid");

// Buat array static untuk urutan hari
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

/** Render jadwal kuliah dalam grid (kolom per hari). Urutkan per jam. */
function renderSchedule() {
  const courses = getCourses();
  
  // Bersihkan grid
  scheduleGrid.innerHTML = "";

  // Buat kolom untuk masing-masing hari
  DAYS.forEach(day => {
    const column = document.createElement("div");
    column.className = "day-column";
    column.innerHTML = `<h3>${day}</h3>`;

    // Filter courses sesuai hari, lalu urutkan naik berdasarkan jam
    const dayCourses = courses
      .filter(c => c.day === day)
      .sort((a,b) => (a.time > b.time ? 1 : -1));

    // Tampilkan course
    dayCourses.forEach(course => {
      const card = document.createElement("div");
      card.className = "course-card";
      card.innerHTML = `
        <div><strong>${course.name}</strong></div>
        <div>${course.time} @ ${course.room}</div>
        <div class="course-actions">
          <button class="edit-course-btn">Edit</button>
          <button class="delete-course-btn">Del</button>
        </div>
      `;
      // Klik card untuk menuju meetings view
      card.addEventListener("click", (e) => {
        // Cegah event bubbling ketika klik edit/del
        if (e.target.classList.contains("edit-course-btn") ||
            e.target.classList.contains("delete-course-btn")) return;
        
        openMeetingsView(course.id);
      });

      // Aksi Edit/Hapus
      const editBtn = card.querySelector(".edit-course-btn");
      const delBtn = card.querySelector(".delete-course-btn");
      editBtn.addEventListener("click", () => startEditCourse(course.id));
      delBtn.addEventListener("click", () => deleteCourse(course.id));

      column.appendChild(card);
    });

    scheduleGrid.appendChild(column);
  });
}

// Tambah / Simpan Course
saveCourseBtn.addEventListener("click", () => {
  const id = courseIdInput.value ? Number(courseIdInput.value) : Date.now();
  const name = courseNameInput.value.trim();
  const day = courseDayInput.value;
  const time = courseTimeInput.value;
  const room = courseRoomInput.value.trim();

  if (!name || !time || !room) {
    alert("Mohon isi semua field (nama, jam, ruangan).");
    return;
  }

  const courses = getCourses();
  // Jika sedang edit, hapus course lama
  if (courseIdInput.value) {
    const idx = courses.findIndex(c => c.id === id);
    if (idx > -1) {
      // Simpan data existing meetings agar tidak hilang
      const existingMeetings = courses[idx].meetings;
      courses.splice(idx, 1);
      const updated = new Course(id, name, day, time, room);
      updated.meetings = existingMeetings;
      courses.push(updated);
    }
  } else {
    // Tambah course baru
    const newCourse = new Course(id, name, day, time, room);
    courses.push(newCourse);
  }
  saveCourses(courses);
  resetCourseForm();
  renderSchedule();
});

function startEditCourse(courseId) {
  const courses = getCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return;
  // Isi form dengan data
  courseIdInput.value = course.id;
  courseNameInput.value = course.name;
  courseDayInput.value = course.day;
  courseTimeInput.value = course.time;
  courseRoomInput.value = course.room;
  cancelEditCourseBtn.style.display = "inline-block";
}

cancelEditCourseBtn.addEventListener("click", () => {
  resetCourseForm();
});

function resetCourseForm() {
  courseIdInput.value = "";
  courseNameInput.value = "";
  courseDayInput.value = "Senin";
  courseTimeInput.value = "";
  courseRoomInput.value = "";
  cancelEditCourseBtn.style.display = "none";
}

function deleteCourse(courseId) {
  const c = confirm("Yakin ingin menghapus jadwal mata kuliah ini?");
  if (!c) return;
  const courses = getCourses().filter(c => c.id !== courseId);
  saveCourses(courses);
  renderSchedule();
}

/***************************************************
 * 2. MEETINGS VIEW (List Pertemuan)
 ***************************************************/
const meetingsTitle = document.getElementById("meetings-title");
const meetingIdInput = document.getElementById("meeting-id");
const meetingTitleInput = document.getElementById("meeting-title");
const saveMeetingBtn = document.getElementById("save-meeting-btn");
const cancelEditMeetingBtn = document.getElementById("cancel-edit-meeting-btn");
const meetingsList = document.getElementById("meetings-list");

// Simpan courseId yang sedang dibuka
let activeCourseId = null;

function openMeetingsView(courseId) {
  activeCourseId = courseId;
  showView("meetings-view");
  renderMeetings();
}

function renderMeetings() {
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  
  meetingsTitle.textContent = `Pertemuan untuk: ${course.name}`;
  meetingsList.innerHTML = "";

  // Tampilkan daftarnya
  course.meetings.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><strong>${m.title}</strong></span>
      <div class="meeting-actions">
        <button class="edit-meeting-btn">Edit</button>
        <button class="delete-meeting-btn">Del</button>
      </div>
    `;
    // Klik li -> buka detail meeting
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-meeting-btn") ||
          e.target.classList.contains("delete-meeting-btn")) return;
      openMeetingDetailView(m.id);
    });
    // Edit / Delete
    const editBtn = li.querySelector(".edit-meeting-btn");
    const delBtn = li.querySelector(".delete-meeting-btn");
    editBtn.addEventListener("click", () => startEditMeeting(m.id));
    delBtn.addEventListener("click", () => deleteMeeting(m.id));

    meetingsList.appendChild(li);
  });
}

// Tambah / Simpan Meeting
saveMeetingBtn.addEventListener("click", () => {
  const id = meetingIdInput.value ? Number(meetingIdInput.value) : Date.now();
  const title = meetingTitleInput.value.trim();
  if (!title) {
    alert("Judul pertemuan tidak boleh kosong.");
    return;
  }
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;

  // Jika edit
  if (meetingIdInput.value) {
    const idx = course.meetings.findIndex(m => m.id === id);
    if (idx > -1) {
      const existingNotes = course.meetings[idx].notes;
      course.meetings.splice(idx, 1); 
      const updated = new Meeting(id, title);
      updated.notes = existingNotes; // pertahankan catatan
      course.meetings.push(updated);
    }
  } else {
    // Buat meeting baru
    const newM = new Meeting(id, title);
    course.meetings.push(newM);
  }
  saveCourses(courses);
  resetMeetingForm();
  renderMeetings();
});

function startEditMeeting(meetingId) {
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  const meeting = course.meetings.find(m => m.id === meetingId);
  if (!meeting) return;
  meetingIdInput.value = meeting.id;
  meetingTitleInput.value = meeting.title;
  cancelEditMeetingBtn.style.display = "inline-block";
}

cancelEditMeetingBtn.addEventListener("click", () => {
  resetMeetingForm();
});

function resetMeetingForm() {
  meetingIdInput.value = "";
  meetingTitleInput.value = "";
  cancelEditMeetingBtn.style.display = "none";
}

function deleteMeeting(meetingId) {
  const c = confirm("Yakin ingin menghapus pertemuan ini?");
  if (!c) return;
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  course.meetings = course.meetings.filter(m => m.id !== meetingId);
  saveCourses(courses);
  renderMeetings();
}

/***************************************************
 * 3. MEETING DETAIL VIEW (Cornell Notes)
 ***************************************************/
const detailTitle = document.getElementById("detail-title");
const notesModeInput = document.getElementById("notes-mode");
const notesKeypointsInput = document.getElementById("notes-keypoints");
const notesTextInput = document.getElementById("notes-text");
const notesSummaryInput = document.getElementById("notes-summary");

const saveNotesBtn = document.getElementById("save-notes-btn");
const cancelEditNotesBtn = document.getElementById("cancel-edit-notes-btn");
const notesContainer = document.getElementById("notes-container");

// Simpan meetingId yang sedang dibuka
let activeMeetingId = null;

function openMeetingDetailView(meetingId) {
  activeMeetingId = meetingId;
  showView("meeting-detail-view");
  renderMeetingDetail();
}

function renderMeetingDetail() {
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  const meeting = course.meetings.find(m => m.id === activeMeetingId);
  if (!meeting) return;
  
  detailTitle.textContent = `Cornell Notes: ${meeting.title}`;
  
  // Tampilkan semua notes
  notesContainer.innerHTML = "";
  meeting.notes.forEach(nt => {
    const div = document.createElement("div");
    div.className = "note-entry";
    div.innerHTML = `
      <div><strong>Key Points:</strong> ${nt.keypoints}</div>
      <div><strong>Notes:</strong> ${nt.note}</div>
      <div><strong>Summary:</strong> ${nt.summary}</div>
      <div class="note-actions">
        <button class="edit-note-btn">Edit</button>
        <button class="delete-note-btn">Del</button>
      </div>
    `;
    const editBtn = div.querySelector(".edit-note-btn");
    const deleteBtn = div.querySelector(".delete-note-btn");
    editBtn.addEventListener("click", () => startEditNote(nt.id));
    deleteBtn.addEventListener("click", () => deleteNote(nt.id));
    notesContainer.appendChild(div);
  });
  resetNotesForm();
}

// Tambah / Simpan Cornell Note
saveNotesBtn.addEventListener("click", () => {
  const keypoints = notesKeypointsInput.value.trim();
  const noteText = notesTextInput.value.trim();
  const summary = notesSummaryInput.value.trim();

  if (!keypoints || !noteText || !summary) {
    alert("Mohon isi Key Points, Notes, dan Summary.");
    return;
  }

  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  const meeting = course.meetings.find(m => m.id === activeMeetingId);
  if (!meeting) return;

  // Apakah sedang edit?
  if (notesModeInput.value.startsWith("edit-")) {
    const noteId = Number(notesModeInput.value.split("-")[1]);
    const idx = meeting.notes.findIndex(n => n.id === noteId);
    if (idx > -1) {
      meeting.notes.splice(idx, 1); 
      const updated = new CornellNote(noteId, keypoints, noteText, summary);
      meeting.notes.push(updated);
    }
  } else {
    // Tambah note baru
    const newNote = new CornellNote(Date.now(), keypoints, noteText, summary);
    meeting.notes.push(newNote);
  }

  saveCourses(courses);
  renderMeetingDetail();
});

/** Edit Note */
function startEditNote(noteId) {
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  const meeting = course.meetings.find(m => m.id === activeMeetingId);
  if (!meeting) return;
  const note = meeting.notes.find(n => n.id === noteId);
  if (!note) return;
  
  notesModeInput.value = `edit-${noteId}`;
  notesKeypointsInput.value = note.keypoints;
  notesTextInput.value = note.note;
  notesSummaryInput.value = note.summary;
  cancelEditNotesBtn.style.display = "inline-block";
}

cancelEditNotesBtn.addEventListener("click", () => {
  resetNotesForm();
});

function resetNotesForm() {
  notesModeInput.value = "add";
  notesKeypointsInput.value = "";
  notesTextInput.value = "";
  notesSummaryInput.value = "";
  cancelEditNotesBtn.style.display = "none";
}

/** Delete Note */
function deleteNote(noteId) {
  const c = confirm("Yakin ingin menghapus catatan ini?");
  if (!c) return;
  const courses = getCourses();
  const course = courses.find(c => c.id === activeCourseId);
  if (!course) return;
  const meeting = course.meetings.find(m => m.id === activeMeetingId);
  if (!meeting) return;
  meeting.notes = meeting.notes.filter(n => n.id !== noteId);
  saveCourses(courses);
  renderMeetingDetail();
}

/***************************************************
 * EVENT: Back Buttons
 ***************************************************/
// Tombol “Kembali ke Jadwal”
document.querySelectorAll(".back-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    showView(target);
  });
});

/***************************************************
 * INIT
 ***************************************************/
// Mulai dengan menampilkan schedule-view
showView("schedule-view");
renderSchedule();
