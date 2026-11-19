(function () {
  "use strict";

  var $ = function (selector) { return document.querySelector(selector); };
  var progressKey = "tamasrazim.typing-lesson.progress.v1";
  var bestKey = "tamasrazim.typing-lesson.best.v1";

  var curriculum = [
    {
      group: "01 / HOME ROW",
      lessons: [
        {
          id: "anchors", title: "Find the F and J anchors", level: "01",
          description: "Locate the small raised marks without looking down.",
          text: "fff jjj fff jjj fj jf ff jj fjf jfj f j f j ff jj",
          tip: "Rest your index fingers on F and J. Feel for the raised marks instead of searching visually."
        },
        {
          id: "home-row", title: "Build the home row", level: "02",
          description: "Keep your fingers close to the keys they control.",
          text: "asdf jkl; asdf jkl; sad lad; ask dad; fall; flask; all; salad.",
          tip: "Return each finger to its home position after every reach. Keep your wrists relaxed."
        },
        {
          id: "home-words", title: "Home-row words", level: "03",
          description: "Turn familiar key patterns into complete words.",
          text: "a sad lad asks dad; a flask falls; all lads ask; a salad is full.",
          tip: "Aim for an even rhythm. Do not rush the next word while the current one is still inaccurate."
        }
      ]
    },
    {
      group: "02 / TOP ROW",
      lessons: [
        {
          id: "top-reach", title: "Reach to the top row", level: "04",
          description: "Learn the keys above your home position.",
          text: "qwer uiop qwer uiop ty ty ty re we op io qw er ui op",
          tip: "Move from the home row with the assigned finger, then return. Avoid lifting your whole hand."
        },
        {
          id: "top-words", title: "Top-row combinations", level: "05",
          description: "Practise short words while keeping your hands anchored.",
          text: "we were quite quiet; write your query; our power tower is ripe.",
          tip: "Use the correct finger for each reach. Let your hands move as little as possible."
        }
      ]
    },
    {
      group: "03 / BOTTOM ROW",
      lessons: [
        {
          id: "bottom-reach", title: "Reach to the bottom row", level: "06",
          description: "Build control over the lower letter row.",
          text: "zxcv bnm, zxcv bnm, zx cv bn m, cvb nmb vcz",
          tip: "Reach down from the home row without sliding your palms across the keyboard."
        },
        {
          id: "bottom-words", title: "Bottom-row words", level: "07",
          description: "Connect the lower keys into useful patterns.",
          text: "mix, zoom, cave, van, box, minimum, civic, combine, zinc, max.",
          tip: "Keep your fingers curved and use the nearest assigned finger for each key."
        }
      ]
    },
    {
      group: "04 / FLUENCY",
      lessons: [
        {
          id: "mixed-words", title: "Mixed-key words", level: "08",
          description: "Move across all three letter rows.",
          text: "the quick brown fox jumps over the lazy dog; pack my box with five dozen liquor jugs.",
          tip: "Look ahead by a word, not by a letter. Let your fingers follow the text."
        },
        {
          id: "punctuation", title: "Punctuation and spacing", level: "09",
          description: "Practise commas, full stops, apostrophes, and capitals.",
          text: "Slow down, stay accurate, and keep going. It's better to type well than to type fast!",
          tip: "Use the opposite hand for Shift when possible. Pause briefly at punctuation without losing your rhythm."
        },
        {
          id: "final-run", title: "Full-keyboard passage", level: "10",
          description: "Bring the whole keyboard together in a short passage.",
          text: "Good typing is a repeatable skill. Keep your fingers near the home row, use the right finger for every key, and let accuracy guide your speed. A steady practice routine will build confidence over time.",
          tip: "Finish with control. When you make a mistake, correct it calmly and continue at a comfortable pace."
        }
      ]
    }
  ];

  var allLessons = [];
  curriculum.forEach(function (group) {
    group.lessons.forEach(function (lesson) {
      lesson.group = group.group;
      allLessons.push(lesson);
    });
  });

  var testText = [
    "Good typing is not about rushing from one key to another. It is about finding a steady rhythm, using the correct fingers, and staying accurate as the words become longer.",
    "Keep your hands relaxed and return to the home row after every reach. Look at the screen instead of watching your fingers. Small improvements become easier to notice with regular practice.",
    "A clear sentence gives your hands a chance to move across the whole keyboard. Use commas, full stops, and spaces carefully. Accuracy makes speed more consistent over time."
  ].join(" ");

  var completed = new Set();
  var bestScores = {};
  var activeIndex = 0;
  var activeLesson = null;
  var mode = "lesson";
  var targetText = "";
  var duration = 60;
  var startedAt = 0;
  var finished = false;
  var clockHandle = 0;

  var lessonList = $("#lessonList");
  var prompt = $("#prompt");
  var input = $("#typingInput");
  var liveStatus = $("#liveStatus");
  var nextButton = $("#nextLesson");
  var testDuration = $("#testDuration");

  function readLocalState() {
    try {
      var saved = JSON.parse(localStorage.getItem(progressKey) || "[]");
      if (Array.isArray(saved)) completed = new Set(saved);
    } catch (error) { completed = new Set(); }
    try {
      bestScores = JSON.parse(localStorage.getItem(bestKey) || "{}") || {};
    } catch (error) { bestScores = {}; }
  }

  function saveLocalState() {
    try {
      localStorage.setItem(progressKey, JSON.stringify(Array.from(completed)));
      localStorage.setItem(bestKey, JSON.stringify(bestScores));
    } catch (error) {
      liveStatus.textContent = "Browser storage is unavailable. This session will still work, but progress may not be saved.";
    }
  }

  function formatTime(seconds) {
    var safe = Math.max(0, Math.floor(seconds));
    var minutes = Math.floor(safe / 60);
    var remaining = safe % 60;
    return String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0");
  }

  function elapsedSeconds() {
    return startedAt ? Math.max(0, (performance.now() - startedAt) / 1000) : 0;
  }

  function typedMetrics() {
    var typed = input.value;
    var correct = 0;
    var errors = 0;
    var limit = Math.min(typed.length, targetText.length);
    for (var i = 0; i < limit; i += 1) {
      if (typed[i] === targetText[i]) correct += 1;
      else errors += 1;
    }
    var accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;
    var seconds = elapsedSeconds();
    var wpm = seconds > 0 ? Math.round((correct / 5) / (seconds / 60)) : 0;
    return { typed: typed, correct: correct, errors: errors, accuracy: accuracy, seconds: seconds, wpm: wpm };
  }

  function renderPrompt() {
    var typed = input.value;
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < targetText.length; i += 1) {
      var span = document.createElement("span");
      var character = targetText[i];
      span.textContent = character === " " ? "\u00a0" : character;
      if (i < typed.length) {
        span.className = typed[i] === character ? "is-correct" : "is-error";
      } else if (i === typed.length && !finished) {
        span.className = "is-current";
      }
      fragment.appendChild(span);
    }
    prompt.replaceChildren(fragment);
    updateNextKey();
  }

  function renderKeyboard() {
    var rows = ["1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"];
    var keyboard = $("#keyboard");
    keyboard.replaceChildren();
    rows.forEach(function (rowText) {
      var row = document.createElement("div");
      row.className = "key-row";
      Array.from(rowText).forEach(function (key) {
        var keyElement = document.createElement("span");
        keyElement.className = "key";
        keyElement.dataset.key = key.toLowerCase();
        keyElement.textContent = key;
        row.appendChild(keyElement);
      });
      keyboard.appendChild(row);
    });
    var spaceRow = document.createElement("div");
    spaceRow.className = "space-row";
    var space = document.createElement("span");
    space.className = "key key-space";
    space.dataset.key = " ";
    space.textContent = "SPACE";
    spaceRow.appendChild(space);
    keyboard.appendChild(spaceRow);
  }

  function updateNextKey() {
    var keys = document.querySelectorAll(".key");
    keys.forEach(function (key) { key.classList.remove("is-next"); });
    if (finished || input.disabled) return;
    var next = targetText[input.value.length];
    if (typeof next === "undefined") return;
    var match = Array.from(keys).find(function (key) { return key.dataset.key === next.toLowerCase(); });
    if (match) match.classList.add("is-next");
  }

  function renderLessonList() {
    lessonList.replaceChildren();
    curriculum.forEach(function (group) {
      var groupElement = document.createElement("div");
      groupElement.className = "lesson-group";
      var heading = document.createElement("p");
      heading.className = "lesson-group-title";
      heading.textContent = group.group;
      groupElement.appendChild(heading);
      group.lessons.forEach(function (lesson) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "lesson-choice";
        button.dataset.lessonId = lesson.id;
        button.setAttribute("aria-current", activeLesson && activeLesson.id === lesson.id ? "true" : "false");
        var number = document.createElement("span");
        number.className = "lesson-number";
        number.textContent = lesson.level;
        var title = document.createElement("span");
        title.className = "lesson-name";
        title.textContent = lesson.title;
        var mark = document.createElement("span");
        mark.className = "lesson-check";
        mark.textContent = completed.has(lesson.id) ? "✓" : "";
        button.append(number, title, mark);
        button.addEventListener("click", function () { selectLesson(lesson.id); });
        groupElement.appendChild(button);
      });
      lessonList.appendChild(groupElement);
    });
    var count = completed.size;
    $("#courseCount").textContent = count + " / " + allLessons.length;
    $("#courseProgress").style.width = ((count / allLessons.length) * 100) + "%";
  }

  function updateBestDisplay() {
    if (mode === "lesson" && activeLesson) {
      var best = bestScores[activeLesson.id];
      $("#bestSpeed").textContent = best ? "BEST " + best + " WPM" : "BEST —";
    } else {
      $("#bestSpeed").textContent = "TIMED TEST";
    }
  }

  function updateMetrics() {
    var stats = typedMetrics();
    $("#wpm").textContent = String(stats.wpm);
    $("#accuracy").textContent = stats.accuracy + "%";
    $("#mistakes").textContent = String(stats.errors);

    if (mode === "test") {
      var remaining = Math.max(0, duration - stats.seconds);
      $("#timeLabel").textContent = "REMAINING";
      $("#time").textContent = formatTime(startedAt ? remaining : duration);
      $("#timeHint").textContent = startedAt ? "counting down" : "starts with first key";
      if (startedAt && remaining <= 0 && !finished) finishTest();
    } else {
      $("#timeLabel").textContent = "TIME";
      $("#time").textContent = formatTime(stats.seconds);
      $("#timeHint").textContent = startedAt ? "session elapsed" : "starts with first key";
    }

    var percentage = targetText.length ? Math.min(100, (input.value.length / targetText.length) * 100) : 0;
    $("#exerciseProgress").textContent = Math.round(percentage) + "% COMPLETE";
  }

  function resetSession() {
    finished = false;
    startedAt = 0;
    input.value = "";
    input.disabled = false;
    if (mode === "test") {
      targetText = testText + " " + testText;
      input.maxLength = targetText.length;
      $("#lessonEyebrow").textContent = "TIMED TEST / " + duration + " SECONDS";
      $("#lessonTitle").textContent = "Find your natural pace";
      $("#lessonDescription").textContent = "Type accurately for the full test. The clock starts with your first key.";
      $("#modeBadge").textContent = "SPEED TEST / READY";
      liveStatus.textContent = "Ready when you are. The timer starts with your first keystroke.";
    } else {
      input.maxLength = targetText.length;
      $("#modeBadge").textContent = "GUIDED LESSON";
      liveStatus.textContent = "Start typing when you are ready. Accuracy comes before speed.";
    }
    nextButton.disabled = true;
    renderPrompt();
    updateMetrics();
    updateBestDisplay();
  }

  function selectLesson(id) {
    var found = allLessons.find(function (lesson) { return lesson.id === id; });
    if (!found) return;
    mode = "lesson";
    activeLesson = found;
    activeIndex = allLessons.indexOf(found);
    targetText = found.text;
    $("#lessonEyebrow").textContent = "LESSON " + found.level + " / " + found.group.split(" / ")[1];
    $("#lessonTitle").textContent = found.title;
    $("#lessonDescription").textContent = found.description;
    $("#lessonTip").textContent = found.tip;
    renderLessonList();
    resetSession();
    input.focus({ preventScroll: true });
  }

  function startTest() {
    mode = "test";
    activeLesson = null;
    duration = Number(testDuration.value) || 60;
    targetText = testText + " " + testText;
    $("#lessonTip").textContent = "Use your normal touch-typing technique. The final result is a snapshot of this timed session.";
    renderLessonList();
    resetSession();
    input.focus({ preventScroll: true });
  }

  function completeLesson() {
    if (finished) return;
    finished = true;
    input.disabled = true;
    completed.add(activeLesson.id);
    var stats = typedMetrics();
    if (!bestScores[activeLesson.id] || stats.wpm > bestScores[activeLesson.id]) {
      bestScores[activeLesson.id] = stats.wpm;
    }
    saveLocalState();
    renderLessonList();
    nextButton.disabled = false;
    liveStatus.textContent = "Lesson complete. " + stats.accuracy + "% accuracy at " + stats.wpm + " WPM. Repeat it to improve your consistency, or continue to the next lesson.";
    updateBestDisplay();
    renderPrompt();
  }

  function finishTest() {
    if (finished) return;
    finished = true;
    input.disabled = true;
    var stats = typedMetrics();
    liveStatus.textContent = "Test complete — " + stats.wpm + " WPM, " + stats.accuracy + "% accuracy, " + stats.errors + " mistakes. Restart to try again.";
    $("#modeBadge").textContent = "TEST COMPLETE";
    nextButton.disabled = true;
    renderPrompt();
    updateMetrics();
  }

  function nextLesson() {
    if (mode !== "lesson" || !finished) return;
    var nextIndex = (activeIndex + 1) % allLessons.length;
    selectLesson(allLessons[nextIndex].id);
  }

  input.addEventListener("input", function () {
    if (finished) return;
    if (input.value.length && !startedAt) startedAt = performance.now();

    if (mode === "test" && input.value.length > targetText.length - 300) {
      targetText += " " + testText;
      input.maxLength = targetText.length;
    }

    renderPrompt();
    updateMetrics();

    if (mode === "lesson" && input.value.length >= targetText.length) {
      completeLesson();
    } else if (mode === "test") {
      liveStatus.textContent = "Keep a steady rhythm. Correct characters count toward your speed; mistakes remain visible above.";
    }
  });

  input.addEventListener("keydown", function (event) {
    var key = event.key === " " ? " " : event.key.toLowerCase();
    var pressed = Array.from(document.querySelectorAll(".key")).find(function (element) {
      return element.dataset.key === key;
    });
    if (pressed) pressed.classList.add("is-pressed");
  });
  input.addEventListener("keyup", function () {
    document.querySelectorAll(".key.is-pressed").forEach(function (element) { element.classList.remove("is-pressed"); });
  });

  $("#startTest").addEventListener("click", startTest);
  $("#restartLesson").addEventListener("click", resetSession);
  $("#nextLesson").addEventListener("click", nextLesson);
  $("#resetProgress").addEventListener("click", function () {
    if (!window.confirm("Reset completed lessons and saved best speeds on this browser?")) return;
    completed.clear();
    bestScores = {};
    saveLocalState();
    renderLessonList();
    updateBestDisplay();
    liveStatus.textContent = "Local progress has been reset.";
  });

  renderKeyboard();
  readLocalState();
  renderLessonList();
  selectLesson(allLessons[0].id);
  clockHandle = window.setInterval(updateMetrics, 200);
  window.addEventListener("pagehide", function () {
    if (clockHandle) window.clearInterval(clockHandle);
  });
})();