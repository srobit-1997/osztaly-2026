import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2Mp9SX4IHkD43z_G8buwicBAkC-ka_Ng",
  authDomain: "osztaly2016-fd664.firebaseapp.com",
  projectId: "osztaly2016-fd664",
  storageBucket: "osztaly2016-fd664.firebasestorage.app",
  messagingSenderId: "117220047658",
  appId: "1:117220047658:web:b39aba88582e8aa6473c53",
  measurementId: "G-2T0H6WEBM8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bookingsRef = collection(db, "bookings");

const calendarEl = document.getElementById("calendar");
const nameInput = document.getElementById("name");
const saveBtn = document.getElementById("saveRange");
const clearBtn = document.getElementById("clearRange");
const statusEl = document.getElementById("status");
const savedList = document.getElementById("savedList");

const rangeStart = new Date("2026-03-01T00:00:00");
const rangeEnd = new Date("2026-09-01T00:00:00");

let selectedStart = null;
let selectedEnd = null;

const weekdays = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const monthNames = [
  "Január",
  "Február",
  "Március",
  "Április",
  "Május",
  "Június",
  "Július",
  "Augusztus",
  "Szeptember",
  "Október",
  "November",
  "December",
];

const isSameDay = (a, b) =>
  a && b && a.toDateString() === b.toDateString();

const clampDate = (date) => new Date(date.toDateString());

const formatDate = (date) =>
  date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const buildCalendar = () => {
  calendarEl.innerHTML = "";
  const startMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  for (
    let month = new Date(startMonth);
    month <= endMonth;
    month.setMonth(month.getMonth() + 1)
  ) {
    const monthEl = document.createElement("div");
    monthEl.className = "month";

    const title = document.createElement("h3");
    title.textContent = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
    monthEl.appendChild(title);

    const weekdaysEl = document.createElement("div");
    weekdaysEl.className = "weekdays";
    weekdays.forEach((day) => {
      const span = document.createElement("span");
      span.textContent = day;
      weekdaysEl.appendChild(span);
    });
    monthEl.appendChild(weekdaysEl);

    const daysEl = document.createElement("div");
    daysEl.className = "days";

    const firstDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Monday first

    for (let i = 0; i < startOffset; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day is-out";
      empty.textContent = "";
      daysEl.appendChild(empty);
    }

    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();

    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.textContent = d;

      if (date < rangeStart || date > rangeEnd) {
        dayEl.classList.add("is-out");
      } else {
        dayEl.addEventListener("click", () => handleSelect(date));
      }

      dayEl.dataset.date = date.toISOString();
      daysEl.appendChild(dayEl);
    }

    monthEl.appendChild(daysEl);
    calendarEl.appendChild(monthEl);
  }

  refreshSelectionStyles();
};

const handleSelect = (date) => {
  const cleanDate = clampDate(date);
  if (!selectedStart || (selectedStart && selectedEnd)) {
    selectedStart = cleanDate;
    selectedEnd = null;
  } else if (selectedStart && !selectedEnd) {
    if (cleanDate < selectedStart) {
      selectedEnd = selectedStart;
      selectedStart = cleanDate;
    } else {
      selectedEnd = cleanDate;
    }
  }

  refreshSelectionStyles();
  updateStatus();
};

const refreshSelectionStyles = () => {
  const dayElements = calendarEl.querySelectorAll(".day");
  dayElements.forEach((el) => {
    const date = el.dataset.date ? new Date(el.dataset.date) : null;
    el.classList.remove("is-selected", "is-inrange", "is-start", "is-end");

    if (!date || el.classList.contains("is-out")) return;

    if (selectedStart && isSameDay(date, selectedStart)) {
      el.classList.add("is-selected", "is-start");
    }

    if (selectedEnd && isSameDay(date, selectedEnd)) {
      el.classList.add("is-selected", "is-end");
    }

    if (selectedStart && selectedEnd && date > selectedStart && date < selectedEnd) {
      el.classList.add("is-inrange");
    }
  });
};

const updateStatus = (message = "") => {
  if (message) {
    statusEl.textContent = message;
    return;
  }

  if (!selectedStart) {
    statusEl.textContent = "Válassz egy kezdő dátumot.";
    return;
  }

  if (!selectedEnd) {
    statusEl.textContent = `Kezdő dátum: ${formatDate(selectedStart)}. Válassz egy befejezőt.`;
    return;
  }

  statusEl.textContent = `Kiválasztott: ${formatDate(selectedStart)} – ${formatDate(selectedEnd)}.`;
};

const renderBookings = (bookings) => {
  savedList.innerHTML = "";

  if (!bookings.length) {
    const empty = document.createElement("li");
    empty.textContent = "Még nincs mentett jelölés.";
    savedList.appendChild(empty);
    return;
  }

  bookings.forEach((booking) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = booking.name;
    const range = document.createElement("div");
    range.textContent = `${booking.start} – ${booking.end}`;

    const remove = document.createElement("button");
    remove.className = "ghost";
    remove.textContent = "Törlés";
    remove.addEventListener("click", async () => {
      try {
        await deleteDoc(doc(db, "bookings", booking.id));
      } catch (err) {
        updateStatus("Törlés sikertelen.");
        console.error(err);
      }
    });

    item.appendChild(label);
    item.appendChild(range);
    item.appendChild(remove);
    savedList.appendChild(item);
  });
};

saveBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) {
    updateStatus("Adj meg egy nevet a mentéshez.");
    return;
  }

  if (!selectedStart || !selectedEnd) {
    updateStatus("Válassz teljes dátumtartományt.");
    return;
  }

  try {
    await addDoc(bookingsRef, {
      name,
      start: formatDate(selectedStart),
      end: formatDate(selectedEnd),
      startTs: selectedStart.toISOString(),
      endTs: selectedEnd.toISOString(),
      createdAt: serverTimestamp(),
    });

    updateStatus("Mentve!");
    nameInput.value = "";
    selectedStart = null;
    selectedEnd = null;
    refreshSelectionStyles();
  } catch (err) {
    updateStatus("Mentés sikertelen.");
    console.error(err);
  }
});

clearBtn.addEventListener("click", () => {
  selectedStart = null;
  selectedEnd = null;
  refreshSelectionStyles();
  updateStatus("Tartomány törölve.");
});

const subscribeBookings = () => {
  const q = query(bookingsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    renderBookings(bookings);
  });
};

buildCalendar();
subscribeBookings();
updateStatus();
