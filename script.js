const notesInput = document.getElementById("notes");
const charCount = document.getElementById("charCount");
const output = document.getElementById("output");

const sampleNotes = `Cloud computing delivers computing services such as servers, storage, databases, networking, and software over the internet.
Key benefits include scalability, cost efficiency, flexibility, and access from different locations.
Cloud deployment models include public cloud, private cloud, and hybrid cloud.
Public cloud services are shared across customers, while private cloud resources are dedicated to one organisation.
A hybrid cloud combines public and private cloud environments.
Cloud service models include IaaS (Infrastructure as a Service), PaaS (Platform as a Service), and SaaS (Software as a Service).`;

// remember the notes so "Resurrect" can bring them back later
function saveNotes() {
  localStorage.setItem("lazystudyNotes", notesInput.value);
}

notesInput.addEventListener("input", () => {
  charCount.textContent = `${notesInput.value.length.toLocaleString()} / 12,000 characters`;
  saveNotes();
});

document.getElementById("sampleBtn").addEventListener("click", () => {
  notesInput.value = sampleNotes;
  charCount.textContent = `${notesInput.value.length.toLocaleString()} / 12,000 characters`;
  saveNotes();
});

function getSentences(text) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function showMessage(title, content, label, answers) {
  output.classList.remove("empty");
  output.replaceChildren();

  const labelEl = document.createElement("p");
  labelEl.className = "result-label";
  labelEl.textContent = label;
  output.appendChild(labelEl);

  const titleEl = document.createElement("h3");
  titleEl.className = "result-title";
  titleEl.textContent = title;
  output.appendChild(titleEl);

  if (Array.isArray(content)) {
    const list = document.createElement("ul");
    content.forEach((item, i) => {
      const li = document.createElement("li");
      li.textContent = item;
      // if answers are given, the student types what they remember, then checks
      if (answers) {
        const box = document.createElement("input");
        box.type = "text";
        box.className = "answer-box";
        box.placeholder = "Type what you remember...";
        li.appendChild(box);

        const checkBtn = document.createElement("button");
        checkBtn.type = "button";
        checkBtn.className = "text-button";
        checkBtn.textContent = "Check";
        li.appendChild(checkBtn);

        const answer = document.createElement("p");
        answer.className = "answer";
        answer.textContent = "Your notes say: " + answers[i];
        answer.hidden = true;
        li.appendChild(answer);

        checkBtn.addEventListener("click", () => {
          answer.hidden = !answer.hidden;
        });
      }
      list.appendChild(li);
    });
    output.appendChild(list);

    if (answers) {
      const hint = document.createElement("p");
      hint.className = "notice";
      hint.textContent = "Tip: type what you remember, then press Check to see your notes.";
      output.appendChild(hint);
    }
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = content;
    output.appendChild(paragraph);
  }

  const foot = document.createElement("p");
  foot.className = "notice";
  foot.textContent = "Demo mode: this is a basic local preview, not AI-generated output yet.";
  output.appendChild(foot);

  // copy button (only for real results, not the warning message)
  if (Array.isArray(content) && label !== "WAIT A MOMENT") {
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "text-button";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      const items = Array.from(output.querySelectorAll("li")).map(li => li.firstChild.textContent);
      navigator.clipboard.writeText(items.join("\n"));
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
    });
    output.appendChild(copyBtn);
  }
}

function checkNotes() {
  const text = notesInput.value.trim();
  if (text.length < 20) {
    showMessage("Add a little more detail", "Paste at least a few sentences of notes so LazyStudy AI has something to work with.", "WAIT A MOMENT");
    return null;
  }
  return text;
}

// pick the sentences that use the most repeated (important) words
function pickKeySentences(sentences, count) {
  const skip = ["the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "for", "with", "as", "that", "this", "it", "on", "by", "from", "such", "include", "includes", "while"];
  const freq = {};
  sentences.forEach(s => {
    (s.toLowerCase().match(/[a-z]+/g) || []).forEach(w => {
      if (!skip.includes(w)) freq[w] = (freq[w] || 0) + 1;
    });
  });

  const scored = sentences.map((s, i) => {
    const words = (s.toLowerCase().match(/[a-z]+/g) || []).filter(w => !skip.includes(w));
    let total = 0;
    words.forEach(w => { total += freq[w]; });
    return { s, i, score: words.length ? total / words.length : 0 };
  });

  // take the best ones, then put them back in the original order
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i)
    .map(item => item.s);
}

document.getElementById("summarizeBtn").addEventListener("click", () => {
  const text = checkNotes();
  if (!text) return;
  const sentences = getSentences(text);
  const summary = sentences.length > 4
    ? pickKeySentences(sentences, Math.min(6, Math.max(3, Math.ceil(sentences.length / 3))))
    : sentences;
  showMessage("Key points from your notes", summary, "✦ REVIVED SUMMARY");
});

document.getElementById("questionsBtn").addEventListener("click", () => {
  const text = checkNotes();
  if (!text) return;
  const sentences = getSentences(text);
  const questions = sentences.slice(0, 5).map((sentence, index) => {
    // only show the start of the sentence so the answer isn't given away
    const start = sentence.split(" ").slice(0, 4).join(" ");
    return `Question ${index + 1}: Finish this idea from your notes — “${start} ...”`;
  });
  const answers = sentences.slice(0, 5);
  showMessage("Test your memory", questions, "☾ REVISION QUESTIONS", answers);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  notesInput.value = "";
  charCount.textContent = "0 / 12,000 characters";
  output.replaceChildren();
  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.textContent = "✧";
  const title = document.createElement("h3");
  title.textContent = "Your study guide will appear here";
  output.append(icon, title);
  output.classList.add("empty");
});

// upload a text file into the notes box
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const name = file.name.toLowerCase();
  let text = "";

  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = await file.text();
    } else if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
    } else {
      showMessage("File type not supported", "Please upload a .pdf, .docx, .txt or .md file.", "WAIT A MOMENT");
      return;
    }
  } catch (error) {
    showMessage("Could not read the file", "Something went wrong while opening it. Check your internet connection, or copy the text and paste it in the box.", "WAIT A MOMENT");
    return;
  }

  if (text.trim() === "") {
    showMessage("No text found", "This file has no readable text (a scanned PDF is just a picture). Try a different file or paste the text.", "WAIT A MOMENT");
    return;
  }

  notesInput.value = text.trim().slice(0, 12000);
  charCount.textContent = `${notesInput.value.length.toLocaleString()} / 12,000 characters`;
  saveNotes();

  let message = file.name + " is loaded into the notes box. Now choose summary or questions.";
  if (text.trim().length > 12000) message += " Only the first 12,000 characters were kept.";
  showMessage("Document loaded", message, "📄 UPLOADED");
});

// if the box is empty, bring back the saved notes (or the sample if nothing is saved)
function fillNotes() {
  if (notesInput.value.trim() !== "") return;
  notesInput.value = localStorage.getItem("lazystudyNotes") || sampleNotes;
  charCount.textContent = `${notesInput.value.length.toLocaleString()} / 12,000 characters`;
}

// the three cards at the bottom do the matching step when clicked
const cards = document.querySelectorAll(".how-it-works > div");

cards[0].addEventListener("click", () => {
  const saved = localStorage.getItem("lazystudyNotes");
  if (!saved || saved.trim() === "") {
    showMessage("Nothing to revive yet", "Paste or upload some notes first, then come back and click Resurrect to bring them back.", "WAIT A MOMENT");
  } else {
    notesInput.value = saved;
    charCount.textContent = `${saved.length.toLocaleString()} / 12,000 characters`;
    showMessage("Your previous notes are back", getSentences(saved).slice(0, 3), "📜 RESURRECTED");
  }
  document.querySelector(".workspace").scrollIntoView({ behavior: "smooth" });
});

cards[1].addEventListener("click", () => {
  fillNotes();
  document.getElementById("summarizeBtn").click();
  document.querySelector(".workspace").scrollIntoView({ behavior: "smooth" });
});

cards[2].addEventListener("click", () => {
  fillNotes();
  document.getElementById("questionsBtn").click();
  document.querySelector(".workspace").scrollIntoView({ behavior: "smooth" });
});

// Start with the empty state.
output.classList.add("empty");
