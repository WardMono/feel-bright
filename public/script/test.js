const questionsPerPage = 5;
let currentPage = 0;
const questions = [
  { text: "I am aware of my emotions as I experience them.", reverse: false },
  { text: "I find it easy to recognize how others are feeling even without them saying anything.", reverse: false },
  { text: "I remain calm and composed during stressful situations.", reverse: false },
  { text: "I find it challenging to manage my impulses when upset.", reverse: true },
  { text: "I am open to feedback, even when it is critical.", reverse: false },
  { text: "I take responsibility for my actions and their impact on others.", reverse: false },
  { text: "I can shift my mood to match the emotional needs of a situation.", reverse: false },
  { text: "I try to resolve conflicts calmly and respectfully.", reverse: false },
  { text: "I often reflect on my interactions to understand what went well and what I could improve.", reverse: false },
  { text: "I motivate myself to pursue goals even when I feel discouraged.", reverse: false },
  { text: "I enjoy helping others work through their emotions.", reverse: false },
  { text: "I can recognize my emotional triggers.", reverse: false },
  { text: "I strive to understand others' perspectives.", reverse: false },
  { text: "I maintain control when provoked.", reverse: false },
  { text: "I value emotional honesty in relationships.", reverse: false },
  { text: "I am confident in expressing my feelings.", reverse: false },
  { text: "I can identify my emotional needs.", reverse: false },
  { text: "I adjust well to emotional changes in situations.", reverse: false },
  { text: "I am patient when resolving misunderstandings.", reverse: false },
  { text: "I express gratitude regularly.", reverse: false },
  { text: "I remain focused despite emotional distractions.", reverse: false },
  { text: "I check in with others to see how they are feeling.", reverse: false },
  { text: "I accept responsibility when my emotions affect others negatively.", reverse: false },
  { text: "I seek to improve my emotional responses.", reverse: false },
  { text: "I consider how my words may impact others emotionally.", reverse: false },
  { text: "I am calm under pressure.", reverse: false },
  { text: "I regularly self-reflect on emotional decisions.", reverse: false },
  { text: "I strive to maintain emotional balance.", reverse: false },
  { text: "I show empathy in conversations.", reverse: false },
  { text: "I avoid reacting defensively.", reverse: true },
  { text: "I am proactive in improving emotional health.", reverse: false },
  { text: "I encourage emotional expression in my environment.", reverse: false },
  { text: "I understand how past experiences shape my emotions.", reverse: false },
  { text: "I value feedback to grow emotionally.", reverse: false },
  { text: "I use emotions to make better decisions.", reverse: false },
  { text: "I handle emotionally intense situations maturely.", reverse: false },
  { text: "I regulate my mood throughout the day.", reverse: false },
  { text: "I forgive others to move on emotionally.", reverse: false },
  { text: "I communicate clearly even when emotional.", reverse: false },
  { text: "I regularly self-reflect on emotional decisions.", reverse: false }
];

const reverseScored = questions
  .map((q, index) => q.reverse ? index : null)
  .filter(index => index !== null);
const questionnaire = document.getElementById("questionnaire");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

function renderQuestions(page) {
  questionnaire.innerHTML = "";
  const start = page * questionsPerPage;
  const end = Math.min(start + questionsPerPage, questions.length);

  for (let i = start; i < end; i++) {
    const savedValue = localStorage.getItem(`question_${i}`);
    const div = document.createElement("div");
    div.classList.add("question");
    div.setAttribute("data-question-index", i);
    div.innerHTML = `
      <h3>${questions[i].text}</h3>
      <div class="likert">
        <span class="span-agdig" style="margin-right: 1rem; font-size:2.2vh; color: #66bb6a; font-weight:bold;">Agree</span>
        ${[1, 2, 3, 4, 5, 6, 7].map(n => `
          <input type="radio" id="q${i}_${n}" name="q${i}" value="${n}" ${savedValue == n ? "checked" : ""}>
          <label class="scale-${n}" for="q${i}_${n}"></label>`).join("")}
        <span style="margin-left: 1rem; font-size:2.2vh; color: lightcoral; font-weight:bold;">Disagree</span>
      </div>
    `;
    questionnaire.appendChild(div);
  }

  addRadioListeners();
  updateProgress();
}

function addRadioListeners() {
  const radios = document.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    radio.addEventListener('change', function () {
      const questionIndex = this.name.replace("q", "");
      localStorage.setItem(`question_${questionIndex}`, this.value);
      updateProgress();
      removeRedBorder(questionIndex);
      scrollToNextQuestion(parseInt(questionIndex));
    });
  });
}

function removeRedBorder(index) {
  const qBlock = document.querySelector(`.question[data-question-index="${index}"]`);
  if (qBlock) {
    qBlock.style.border = 'none';
  }
}

function scrollToNextQuestion(currentIndex) {
  const currentElem = document.getElementById(`q${currentIndex}_${localStorage.getItem(`question_${currentIndex}`)}`);
  const questionDiv = currentElem?.closest('.question');
  if (!questionDiv) return;
  const next = questionDiv.nextElementSibling;
  if (next) {
    next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateProgress() {
  let answered = 0;
  for (let i = 0; i < questions.length; i++) {
    if (localStorage.getItem(`question_${i}`)) answered++;
  }

  const percent = Math.round((answered / questions.length) * 100);
  progressBar.style.width = percent + "%";

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentStep = currentPage + 1;

  // PERCENT/STEP POS
  progressPercent.innerHTML = `<span style="float:left">${percent}%</span>`;
  progressText.innerHTML = `<span style="float:right">Step ${currentStep} of ${totalPages}</span>`;


  const submitBtn = document.getElementById("submitBtn");
  const prevBtn = document.querySelector("button[onclick='goToPreviousPage()']");
  const nextBtn = document.querySelector("button[onclick='goToNextPage()']");

  // TOGGLE BUT BASED ON COMPLETION
  if (answered === questions.length) {
    if (submitBtn) submitBtn.style.display = "block";
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
  } else {
    if (submitBtn) submitBtn.style.display = "none";
    if (prevBtn) {
      prevBtn.style.display = "inline-block";
      if (currentPage === 0) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = "0.5";
        prevBtn.style.cursor = "not-allowed";
      } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = "1";
        prevBtn.style.cursor = "pointer";
      }
    }
    if (nextBtn) nextBtn.style.display = "inline-block";
  }
}


function goToPreviousPage() {
  if (currentPage > 0) {
    currentPage--;
    localStorage.setItem("currentPage", currentPage); // ✅ Save current page
    renderQuestions(currentPage);
    const container = document.querySelector('.container');
    if (container) {
      container.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const start = currentPage * questionsPerPage;
  const end = Math.min(start + questionsPerPage, questions.length);

  for (let i = start; i < end; i++) {
    const answered = localStorage.getItem(`question_${i}`);
    const qBlock = document.querySelector(`.question[data-question-index="${i}"]`);
    if (qBlock) {
      qBlock.style.border = 'none';
    }
    if (!answered) {
      if (qBlock) {
        qBlock.style.border = '2px solid red';
        qBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
  }

  if (currentPage < totalPages - 1) {
    currentPage++;
    localStorage.setItem("currentPage", currentPage); // ✅ Save current page
    renderQuestions(currentPage);
    scrollToTopOfQuestionnaire();
  }
}


function scrollToTopOfQuestionnaire() {
  const container = document.querySelector('.container');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

window.onload = () => {
  const savedPage = parseInt(localStorage.getItem("currentPage"));
  if (!isNaN(savedPage) && savedPage >= 0 && savedPage < Math.ceil(questions.length / questionsPerPage)) {
    currentPage = savedPage;
  }
  renderQuestions(currentPage);
  scrollToTopOfQuestionnaire();
};



//SUMMARY OF REPOR

function showSummary() {
  const answers = [];
  let score = 0;
  let unanswered = [];

  for (let i = 0; i < questions.length; i++) {
    const storedValue = localStorage.getItem(`question_${i}`);
    if (!storedValue) unanswered.push(i + 1);
    let val = storedValue ? parseInt(storedValue) : 0;
    if (reverseScored.includes(i) && val !== 0) val = 8 - val;
    score += val;
    answers.push({
      question: questions[i].text,
      answer: storedValue ? storedValue : "No answer"
    });
  }

  if (unanswered.length > 0) {
    alert("Please answer all the questions before submitting.");
    return;
  }

  const overlay = document.getElementById("loadingOverlay");
  const progress = document.getElementById("loadingProgress");
  const percentText = document.getElementById("loadingPercent");
  const messageText = document.getElementById("loadingMessage");

  const messages = [
    "Analyzing emotional patterns...",
    "Calculating your results...",
    "Finalizing your summary..."
  ];

  overlay.style.display = "flex";

  let percent = 0;
  let msgIndex = 0;

  const interval = setInterval(() => {
    percent++;
    progress.style.width = percent + "%";
    percentText.textContent = percent + "%";
    if (percent % 25 === 0 && msgIndex < messages.length) {
      messageText.textContent = messages[msgIndex++];
    }
    if (percent >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        overlay.style.display = "none";
        displayResults(score, answers);
      }, 400);
    }
  }, 160);
}


function displayResults(score, answers) {
  const summary = document.getElementById("summary");
  const summaryModal = document.getElementById("summaryModal");

  const maxScore = questions.length * 7;
  const percentage = Math.round((score / maxScore) * 100);
  let category = "";
  let color = "";

  if (percentage >= 80) {
    category = "High Emotional Intelligence";
    color = "#4caf50";
  } else if (percentage >= 60) {
    category = "Moderate Emotional Intelligence";
    color = "#ff9800";
  } else {
    category = "Needs Improvement";
    color = "#f44336";
  }

  const userInfoHTML = `
    <div class="user-profile">
      <img src="https://via.placeholder.com/100" alt="Profile" class="avatar">
      <div class="user-meta">
        <h2 class="user-name">Your Assessment Result</h2>
        <p><strong>Score:</strong> ${percentage}%</p>
        <p><strong>Category:</strong> ${category}</p>
      </div>
    </div>
  `;

  const resultBarHTML = `
    <div class="result-bar">
      <div class="result-bar-title" style="color: ${color};">${percentage}% - ${category}</div>
      <div class="result-bar-track">
        <div class="result-bar-fill" style="width:${percentage}%; background-color: ${color};"></div>
      </div>
      <div class="result-bar-sub">
        <span>Needs Improvement</span>
        <span>High E.I.</span>
      </div>
    </div>
  `;

  let answersHTML = `<div class="answers-list"><h4>Your Answers:</h4><div class="answers-grid">`;
  answers.forEach((a, i) => {
    answersHTML += `
      <div class="answer-item">
        <strong>Q${i + 1}:</strong> ${a.question}<br>
        <span class="your-answer">Your answer: ${a.answer}</span>
      </div>
    `;
  });
  answersHTML += `</div></div>`;

  const actionsHTML = `
    <div class="action-buttons">
      <button onclick="location.href='index.html'" class="btn">Back to Home</button>
      <button onclick="window.print()" class="btn">Download Result</button>
    </div>
  `;

  summary.innerHTML = userInfoHTML + resultBarHTML + answersHTML + actionsHTML;
  summaryModal.style.display = "flex";

  for (let i = 0; i < questions.length; i++) {
    localStorage.removeItem(`question_${i}`);
  }
  localStorage.removeItem("currentPage"); // ✅ Reset step only after full submission
}
