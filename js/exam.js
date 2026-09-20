/* ============================================================
   SMART SIX — EXAM ENGINE
   js/exam.js

   Works with:
   js/questions.js

   Expected global:
   window.SMART_SIX_QUESTIONS
============================================================ */

(function () {
    "use strict";

    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const CONFIG = {
        TOTAL_TIME: 180 * 60, // 180 minutes
        TOTAL_QUESTIONS: 250,

        STORAGE: {
            STUDENT: "smartSixStudentName",
            ANSWERS: "smartSixAnswers",
            MARKED: "smartSixMarked",
            TIME: "smartSixTimeRemaining",
            STARTED: "smartSixExamStarted",
            RESULT: "smartSixResult",
            FINISHED: "smartSixExamFinished"
        },

        RESULT_PAGE: "result.html"
    };

    /* ========================================================
       STATE
    ======================================================== */

    const state = {
        questions: [],
        currentIndex: 0,

        answers: {},
        marked: {},

        timeRemaining: CONFIG.TOTAL_TIME,

        timer: null,
        saveTimer: null,

        finished: false,
        examStarted: false
    };

    /* ========================================================
       DOM CACHE
    ======================================================== */

    const el = {};

    function cacheDOM() {

        el.questionNumber =
            document.getElementById("questionNumber");

        el.questionId =
            document.getElementById("questionId");

        el.subject =
            document.getElementById("subject");

        el.difficulty =
            document.getElementById("difficulty");

        el.questionText =
            document.getElementById("questionText");

        el.options =
            document.getElementById("options");

        el.progressBar =
            document.getElementById("progressBar");

        el.progressText =
            document.getElementById("progressText");

        el.currentQuestion =
            document.getElementById("currentQuestion");

        el.totalQuestions =
            document.getElementById("totalQuestions");

        el.prevButton =
            document.getElementById("prevButton");

        el.nextButton =
            document.getElementById("nextButton");

        el.markButton =
            document.getElementById("markButton");

        el.finishButton =
            document.getElementById("finishButton");

        el.navigator =
            document.getElementById("questionNavigator");

        el.timer =
            document.getElementById("timer");

        el.timerMinutes =
            document.getElementById("timerMinutes");

        el.timerSeconds =
            document.getElementById("timerSeconds");

        el.answeredCount =
            document.getElementById("answeredCount");

        el.unansweredCount =
            document.getElementById("unansweredCount");

        el.markedCount =
            document.getElementById("markedCount");

        el.studentName =
            document.getElementById("studentName");

        el.finishModal =
            document.getElementById("finishModal");

        el.cancelFinish =
            document.getElementById("cancelFinish");

        el.confirmFinish =
            document.getElementById("confirmFinish");

        el.modalAnswered =
            document.getElementById("modalAnswered");

        el.modalUnanswered =
            document.getElementById("modalUnanswered");

        el.modalMarked =
            document.getElementById("modalMarked");

        el.modalTime =
            document.getElementById("modalTime");

        el.warning =
            document.getElementById("timerWarning");
    }

    /* ========================================================
       SAFE DOM HELPERS
    ======================================================== */

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function showElement(element) {
        if (element) {
            element.style.display = "";
        }
    }

    function hideElement(element) {
        if (element) {
            element.style.display = "none";
        }
    }

    /* ========================================================
       STORAGE
    ======================================================== */

    function storageAvailable() {
        try {
            const testKey = "__smart_six_test__";

            localStorage.setItem(testKey, "1");
            localStorage.removeItem(testKey);

            return true;

        } catch (error) {

            console.warn(
                "Smart Six: localStorage is unavailable.",
                error
            );

            return false;
        }
    }

    function save(key, value) {

        if (!storageAvailable()) {
            return;
        }

        try {
            localStorage.setItem(
                key,
                typeof value === "string"
                    ? value
                    : JSON.stringify(value)
            );

        } catch (error) {

            console.warn(
                `Smart Six: Could not save ${key}`,
                error
            );
        }
    }

    function load(key, fallback = null) {

        if (!storageAvailable()) {
            return fallback;
        }

        try {

            const value =
                localStorage.getItem(key);

            if (value === null) {
                return fallback;
            }

            try {
                return JSON.parse(value);
            } catch {
                return value;
            }

        } catch (error) {

            console.warn(
                `Smart Six: Could not load ${key}`,
                error
            );

            return fallback;
        }
    }

    function remove(key) {

        if (!storageAvailable()) {
            return;
        }

        try {
            localStorage.removeItem(key);
        } catch {}
    }

    /* ========================================================
       LOAD QUESTION BANK
    ======================================================== */

    function loadQuestions() {

        if (
            !window.SMART_SIX_QUESTIONS ||
            !Array.isArray(window.SMART_SIX_QUESTIONS)
        ) {

            showFatalError(
                "Question bank could not be loaded. " +
                "Make sure questions.js is loaded before exam.js."
            );

            return false;
        }

        state.questions =
            window.SMART_SIX_QUESTIONS.slice();

        if (
            state.questions.length !==
            CONFIG.TOTAL_QUESTIONS
        ) {

            console.warn(
                `Smart Six: Expected ${CONFIG.TOTAL_QUESTIONS} questions, ` +
                `found ${state.questions.length}.`
            );
        }

        return true;
    }

    /* ========================================================
       STUDENT
    ======================================================== */

    function loadStudent() {

        const name =
            load(CONFIG.STORAGE.STUDENT, "Student");

        setText(
            el.studentName,
            name || "Student"
        );
    }

    /* ========================================================
       RESTORE EXAM
    ======================================================== */

    function restoreState() {

        const savedAnswers =
            load(CONFIG.STORAGE.ANSWERS, {});

        const savedMarked =
            load(CONFIG.STORAGE.MARKED, {});

        const savedTime =
            load(
                CONFIG.STORAGE.TIME,
                CONFIG.TOTAL_TIME
            );

        if (
            savedAnswers &&
            typeof savedAnswers === "object"
        ) {
            state.answers = savedAnswers;
        }

        if (
            savedMarked &&
            typeof savedMarked === "object"
        ) {
            state.marked = savedMarked;
        }

        if (
            Number.isFinite(Number(savedTime)) &&
            Number(savedTime) >= 0
        ) {

            state.timeRemaining =
                Number(savedTime);
        }

        const savedStarted =
            load(
                CONFIG.STORAGE.STARTED,
                false
            );

        state.examStarted =
            Boolean(savedStarted);

        /*
         * If the exam was not started yet,
         * mark it as started now.
         */

        if (!state.examStarted) {

            state.examStarted = true;

            save(
                CONFIG.STORAGE.STARTED,
                true
            );
        }
    }

    /* ========================================================
       SAVE CURRENT STATE
    ======================================================== */

    function saveState() {

        save(
            CONFIG.STORAGE.ANSWERS,
            state.answers
        );

        save(
            CONFIG.STORAGE.MARKED,
            state.marked
        );

        save(
            CONFIG.STORAGE.TIME,
            state.timeRemaining
        );

        save(
            CONFIG.STORAGE.STARTED,
            state.examStarted
        );
    }

    /* ========================================================
       QUESTION RENDERING
    ======================================================== */

    function renderQuestion() {

        if (!state.questions.length) {
            return;
        }

        const question =
            state.questions[state.currentIndex];

        if (!question) {
            return;
        }

        const number =
            state.currentIndex + 1;

        /* Question meta */

        setText(
            el.questionNumber,
            `Question ${number}`
        );

        setText(
            el.currentQuestion,
            number
        );

        setText(
            el.totalQuestions,
            state.questions.length
        );

        setText(
            el.questionId,
            `#${String(question.id).padStart(3, "0")}`
        );

        setText(
            el.subject,
            question.subject
        );

        setText(
            el.difficulty,
            question.difficulty || "Expert"
        );

        setText(
            el.questionText,
            question.question
        );

        /* Options */

        renderOptions(question);

        /* Progress */

        updateProgress();

        /* Navigator */

        updateNavigator();

        /* Buttons */

        updateNavigationButtons();

        /* Mark state */

        updateMarkButton();

        /* Stats */

        updateStats();
    }

    /* ========================================================
       OPTIONS
    ======================================================== */

    function renderOptions(question) {

        if (!el.options) {
            return;
        }

        el.options.innerHTML = "";

        const selectedAnswer =
            state.answers[question.id];

        question.options.forEach(
            (option, index) => {

                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "answer-option";

                if (
                    Number(selectedAnswer) === index
                ) {

                    button.classList.add(
                        "selected"
                    );
                }

                const letter =
                    String.fromCharCode(
                        65 + index
                    );

                button.innerHTML = `
                    <span class="option-letter">
                        ${letter}
                    </span>

                    <span class="option-text">
                        ${escapeHTML(option)}
                    </span>

                    <span class="option-check">
                        ✓
                    </span>
                `;

                button.addEventListener(
                    "click",
                    () => selectAnswer(index)
                );

                el.options.appendChild(button);
            }
        );
    }

    /* ========================================================
       ANSWER SELECTION
    ======================================================== */

    function selectAnswer(index) {

        if (state.finished) {
            return;
        }

        const question =
            state.questions[state.currentIndex];

        if (!question) {
            return;
        }

        state.answers[question.id] =
            index;

        save(
            CONFIG.STORAGE.ANSWERS,
            state.answers
        );

        renderOptions(question);

        updateNavigator();

        updateStats();

        updateProgress();
    }

    /* ========================================================
       NAVIGATION
    ======================================================== */

    function goToQuestion(index) {

        if (
            index < 0 ||
            index >= state.questions.length
        ) {
            return;
        }

        state.currentIndex = index;

        renderQuestion();

        scrollQuestionIntoView();
    }

    function nextQuestion() {

        if (
            state.currentIndex <
            state.questions.length - 1
        ) {

            goToQuestion(
                state.currentIndex + 1
            );

        } else {

            openFinishModal();
        }
    }

    function previousQuestion() {

        if (state.currentIndex > 0) {

            goToQuestion(
                state.currentIndex - 1
            );
        }
    }

    function updateNavigationButtons() {

        if (el.prevButton) {

            el.prevButton.disabled =
                state.currentIndex === 0;
        }

        if (el.nextButton) {

            const last =
                state.currentIndex ===
                state.questions.length - 1;

            el.nextButton.innerHTML =
                last
                    ? "Finish Exam →"
                    : "Next Question →";
        }
    }

    /* ========================================================
       QUESTION NAVIGATOR
    ======================================================== */

    function buildNavigator() {

        if (!el.navigator) {
            return;
        }

        el.navigator.innerHTML = "";

        state.questions.forEach(
            (question, index) => {

                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "question-number";

                button.dataset.index =
                    index;

                button.textContent =
                    index + 1;

                button.title =
                    `Question ${index + 1}`;

                button.addEventListener(
                    "click",
                    () => goToQuestion(index)
                );

                el.navigator.appendChild(
                    button
                );
            }
        );

        updateNavigator();
    }

    function updateNavigator() {

        if (!el.navigator) {
            return;
        }

        const buttons =
            el.navigator.querySelectorAll(
                ".question-number"
            );

        buttons.forEach(
            (button, index) => {

                const question =
                    state.questions[index];

                button.classList.remove(
                    "current",
                    "answered",
                    "marked"
                );

                if (
                    index ===
                    state.currentIndex
                ) {

                    button.classList.add(
                        "current"
                    );
                }

                if (
                    Object.prototype.hasOwnProperty.call(
                        state.answers,
                        question.id
                    )
                ) {

                    button.classList.add(
                        "answered"
                    );
                }

                if (
                    state.marked[question.id]
                ) {

                    button.classList.add(
                        "marked"
                    );
                }
            }
        );
    }

    /* ========================================================
       MARK FOR REVIEW
    ======================================================== */

    function toggleMark() {

        const question =
            state.questions[state.currentIndex];

        if (!question) {
            return;
        }

        if (state.marked[question.id]) {

            delete state.marked[
                question.id
            ];

        } else {

            state.marked[
                question.id
            ] = true;
        }

        save(
            CONFIG.STORAGE.MARKED,
            state.marked
        );

        updateMarkButton();

        updateNavigator();

        updateStats();
    }

    function updateMarkButton() {

        if (!el.markButton) {
            return;
        }

        const question =
            state.questions[state.currentIndex];

        const marked =
            Boolean(
                question &&
                state.marked[question.id]
            );

        el.markButton.classList.toggle(
            "active",
            marked
        );

        el.markButton.innerHTML =
            marked
                ? "★ Marked"
                : "☆ Mark for Review";
    }

    /* ========================================================
       PROGRESS
    ======================================================== */

    function updateProgress() {

        const total =
            state.questions.length;

        const answered =
            countAnswered();

        const percentage =
            total
                ? Math.round(
                    (answered / total) * 100
                )
                : 0;

        if (el.progressBar) {

            el.progressBar.style.width =
                `${percentage}%`;
        }

        setText(
            el.progressText,
            `${percentage}%`
        );
    }

    /* ========================================================
       STATISTICS
    ======================================================== */

    function countAnswered() {

        return Object.keys(
            state.answers
        ).filter(
            id =>
                state.answers[id] !== null &&
                state.answers[id] !== undefined
        ).length;
    }

    function countMarked() {

        return Object.keys(
            state.marked
        ).filter(
            id => state.marked[id] === true
        ).length;
    }

    function countUnanswered() {

        return Math.max(
            0,
            state.questions.length -
            countAnswered()
        );
    }

    function updateStats() {

        const answered =
            countAnswered();

        const marked =
            countMarked();

        const unanswered =
            countUnanswered();

        setText(
            el.answeredCount,
            answered
        );

        setText(
            el.unansweredCount,
            unanswered
        );

        setText(
            el.markedCount,
            marked
        );
    }

    /* ========================================================
       TIMER
    ======================================================== */

    function startTimer() {

        stopTimer();

        updateTimer();

        state.timer =
            setInterval(
                () => {

                    if (state.finished) {
                        stopTimer();
                        return;
                    }

                    if (
                        state.timeRemaining <= 0
                    ) {

                        state.timeRemaining =
                            0;

                        updateTimer();

                        finishExam(
                            "time"
                        );

                        return;
                    }

                    state.timeRemaining--;

                    updateTimer();

                    /*
                     * Save every 5 seconds.
                     * This avoids unnecessary storage writes.
                     */

                    if (
                        state.timeRemaining % 5 === 0
                    ) {

                        save(
                            CONFIG.STORAGE.TIME,
                            state.timeRemaining
                        );
                    }

                },
                1000
            );
    }

    function stopTimer() {

        if (state.timer) {

            clearInterval(
                state.timer
            );

            state.timer = null;
        }
    }

    function updateTimer() {

        const totalSeconds =
            Math.max(
                0,
                state.timeRemaining
            );

        const minutes =
            Math.floor(
                totalSeconds / 60
            );

        const seconds =
            totalSeconds % 60;

        const formattedMinutes =
            String(minutes).padStart(2, "0");

        const formattedSeconds =
            String(seconds).padStart(2, "0");

        setText(
            el.timerMinutes,
            formattedMinutes
        );

        setText(
            el.timerSeconds,
            formattedSeconds
        );

        if (el.timer) {

            el.timer.textContent =
                `${formattedMinutes}:${formattedSeconds}`;
        }

        updateTimerWarning();
    }

    function updateTimerWarning() {

        if (!el.timer) {
            return;
        }

        const minutes =
            state.timeRemaining / 60;

        el.timer.classList.remove(
            "warning",
            "danger",
            "critical"
        );

        if (minutes <= 5) {

            el.timer.classList.add(
                "critical"
            );

        } else if (minutes <= 10) {

            el.timer.classList.add(
                "danger"
            );

        } else if (minutes <= 30) {

            el.timer.classList.add(
                "warning"
            );
        }

        if (el.warning) {

            if (minutes <= 10) {

                el.warning.textContent =
                    "⚠ Less than 10 minutes remaining";

                showElement(el.warning);

            } else if (minutes <= 30) {

                el.warning.textContent =
                    "⚠ 30 minutes or less remaining";

                showElement(el.warning);

            } else {

                hideElement(el.warning);
            }
        }
    }

    /* ========================================================
       FINISH MODAL
    ======================================================== */

    function openFinishModal() {

        if (!el.finishModal) {

            const unanswered =
                countUnanswered();

            if (
                unanswered > 0 &&
                !confirm(
                    `You have ${unanswered} unanswered questions. ` +
                    `Are you sure you want to finish?`
                )
            ) {
                return;
            }

            finishExam("manual");

            return;
        }

        updateFinishModal();

        el.finishModal.classList.add(
            "show"
        );

        el.finishModal.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function closeFinishModal() {

        if (!el.finishModal) {
            return;
        }

        el.finishModal.classList.remove(
            "show"
        );

        el.finishModal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function updateFinishModal() {

        setText(
            el.modalAnswered,
            countAnswered()
        );

        setText(
            el.modalUnanswered,
            countUnanswered()
        );

        setText(
            el.modalMarked,
            countMarked()
        );

        setText(
            el.modalTime,
            formatTime(
                state.timeRemaining
            )
        );
    }

    /* ========================================================
       FINISH EXAM
    ======================================================== */

    function finishExam(reason = "manual") {

        if (state.finished) {
            return;
        }

        /*
         * Prevent accidental duplicate submissions.
         */

        state.finished = true;

        stopTimer();

        saveState();

        const result =
            calculateResult(reason);

        save(
            CONFIG.STORAGE.RESULT,
            result
        );

        save(
            CONFIG.STORAGE.FINISHED,
            true
        );

        closeFinishModal();

        /*
         * Small delay gives storage time to complete
         * before navigation.
         */

        setTimeout(
            () => {

                window.location.href =
                    CONFIG.RESULT_PAGE;

            },
            100
        );
    }

    /* ========================================================
       RESULT CALCULATION
    ======================================================== */

    function calculateResult(reason) {

        let correct = 0;
        let incorrect = 0;
        let unanswered = 0;

        const subjectStats = {};

        state.questions.forEach(
            question => {

                const subject =
                    question.subject;

                if (!subjectStats[subject]) {

                    subjectStats[subject] = {
                        total: 0,
                        correct: 0,
                        incorrect: 0,
                        unanswered: 0
                    };
                }

                subjectStats[
                    subject
                ].total++;

                const selected =
                    state.answers[
                        question.id
                    ];

                if (
                    selected === undefined ||
                    selected === null
                ) {

                    unanswered++;

                    subjectStats[
                        subject
                    ].unanswered++;

                    return;
                }

                if (
                    Number(selected) ===
                    Number(question.answer)
                ) {

                    correct++;

                    subjectStats[
                        subject
                    ].correct++;

                } else {

                    incorrect++;

                    subjectStats[
                        subject
                    ].incorrect++;
                }
            }
        );

        const total =
            state.questions.length;

        const answered =
            correct + incorrect;

        const accuracy =
            answered > 0
                ? Number(
                    (
                        correct /
                        answered *
                        100
                    ).toFixed(2)
                )
                : 0;

        const percentage =
            total > 0
                ? Number(
                    (
                        correct /
                        total *
                        100
                    ).toFixed(2)
                )
                : 0;

        /*
         * Score:
         * +1 correct
         * 0 incorrect
         * 0 unanswered
         *
         * This can later be changed to
         * negative marking if desired.
         */

        const score = correct;

        const maxScore = total;

        return {

            version: "1.0",

            studentName:
                load(
                    CONFIG.STORAGE.STUDENT,
                    "Student"
                ),

            submittedAt:
                new Date().toISOString(),

            reason,

            totalQuestions:
                total,

            answered,

            correct,

            incorrect,

            unanswered,

            marked:
                countMarked(),

            score,

            maxScore,

            percentage,

            accuracy,

            timeAllowed:
                CONFIG.TOTAL_TIME,

            timeRemaining:
                state.timeRemaining,

            timeUsed:
                CONFIG.TOTAL_TIME -
                state.timeRemaining,

            subjectStats,

            answers:
                state.answers,

            markedQuestions:
                state.marked
        };
    }

    /* ========================================================
       KEYBOARD SHORTCUTS
    ======================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                /*
                 * Do not hijack keyboard input while
                 * typing into an input/textarea.
                 */

                const tag =
                    event.target.tagName;

                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT"
                ) {
                    return;
                }

                if (
                    event.key === "ArrowRight"
                ) {

                    event.preventDefault();

                    nextQuestion();

                } else if (
                    event.key === "ArrowLeft"
                ) {

                    event.preventDefault();

                    previousQuestion();

                } else if (
                    event.key.toLowerCase() === "m"
                ) {

                    event.preventDefault();

                    toggleMark();
                }
            }
        );
    }

    /* ========================================================
       BUTTON EVENTS
    ======================================================== */

    function setupEvents() {

        if (el.prevButton) {

            el.prevButton.addEventListener(
                "click",
                previousQuestion
            );
        }

        if (el.nextButton) {

            el.nextButton.addEventListener(
                "click",
                nextQuestion
            );
        }

        if (el.markButton) {

            el.markButton.addEventListener(
                "click",
                toggleMark
            );
        }

        if (el.finishButton) {

            el.finishButton.addEventListener(
                "click",
                openFinishModal
            );
        }

        if (el.cancelFinish) {

            el.cancelFinish.addEventListener(
                "click",
                closeFinishModal
            );
        }

        if (el.confirmFinish) {

            el.confirmFinish.addEventListener(
                "click",
                () => finishExam("manual")
            );
        }

        if (el.finishModal) {

            el.finishModal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        el.finishModal
                    ) {

                        closeFinishModal();
                    }
                }
            );
        }

        setupKeyboard();
    }

    /* ========================================================
       PAGE EXIT PROTECTION
    ======================================================== */

    function setupBeforeUnload() {

        window.addEventListener(
            "beforeunload",
            event => {

                if (
                    state.finished ||
                    state.timeRemaining <= 0
                ) {
                    return;
                }

                saveState();

                event.preventDefault();

                event.returnValue = "";
            }
        );
    }

    /* ========================================================
       AUTO SAVE
    ======================================================== */

    function startAutoSave() {

        if (state.saveTimer) {
            clearInterval(
                state.saveTimer
            );
        }

        state.saveTimer =
            setInterval(
                () => {

                    if (
                        !state.finished
                    ) {

                        saveState();
                    }

                },
                5000
            );
    }

    /* ========================================================
       SCROLL
    ======================================================== */

    function scrollQuestionIntoView() {

        const target =
            document.querySelector(
                ".question-card"
            ) ||
            document.querySelector(
                ".question-container"
            );

        if (!target) {
            return;
        }

        /*
         * Only scroll on smaller screens.
         */

        if (
            window.innerWidth <= 900
        ) {

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    /* ========================================================
       ESCAPE HTML
    ======================================================== */

    function escapeHTML(value) {

        const div =
            document.createElement("div");

        div.textContent =
            String(value);

        return div.innerHTML;
    }

    /* ========================================================
       TIME FORMAT
    ======================================================== */

    function formatTime(seconds) {

        const safe =
            Math.max(
                0,
                Number(seconds) || 0
            );

        const hours =
            Math.floor(
                safe / 3600
            );

        const minutes =
            Math.floor(
                (safe % 3600) / 60
            );

        const secs =
            safe % 60;

        if (hours > 0) {

            return [
                String(hours).padStart(2, "0"),
                String(minutes).padStart(2, "0"),
                String(secs).padStart(2, "0")
            ].join(":");
        }

        return [
            String(minutes).padStart(2, "0"),
            String(secs).padStart(2, "0")
        ].join(":");
    }

    /* ========================================================
       FATAL ERROR
    ======================================================== */

    function showFatalError(message) {

        document.body.innerHTML = `
            <div style="
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:30px;
                background:#05070d;
                color:#fff;
                font-family:Arial,sans-serif;
            ">
                <div style="
                    width:min(700px,100%);
                    padding:35px;
                    border:1px solid rgba(255,80,120,.35);
                    border-radius:20px;
                    background:rgba(255,255,255,.04);
                    box-shadow:0 20px 80px rgba(0,0,0,.45);
                    text-align:center;
                ">
                    <div style="
                        font-size:50px;
                        margin-bottom:20px;
                    ">⚠</div>

                    <h1 style="
                        margin:0 0 15px;
                    ">
                        SMART SIX
                    </h1>

                    <p style="
                        color:#ff6b8a;
                        line-height:1.8;
                    ">
                        ${escapeHTML(message)}
                    </p>

                    <p style="
                        color:#8d96aa;
                        font-size:14px;
                    ">
                        Check the browser console for more details.
                    </p>
                </div>
            </div>
        `;
    }

    /* ========================================================
       PREVENT ACCIDENTAL MULTIPLE TABS
    ======================================================== */

    function setupExamIdentity() {

        /*
         * A unique tab/session identifier.
         * This does not prevent the browser from opening
         * another tab, but helps keep the current exam state
         * consistent.
         */

        if (
            !load("smartSixExamTab")
        ) {

            save(
                "smartSixExamTab",
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`
            );
        }
    }

    /* ========================================================
       CLEANUP OLD RESULT
    ======================================================== */

    function prepareNewAttempt() {

        /*
         * If the landing page started a new attempt,
         * remove the previous "finished" flag.
         */

        const finished =
            load(
                CONFIG.STORAGE.FINISHED,
                false
            );

        if (finished) {

            remove(
                CONFIG.STORAGE.FINISHED
            );

            remove(
                CONFIG.STORAGE.RESULT
            );

            remove(
                CONFIG.STORAGE.ANSWERS
            );

            remove(
                CONFIG.STORAGE.MARKED
            );

            remove(
                CONFIG.STORAGE.TIME
            );

            remove(
                CONFIG.STORAGE.STARTED
            );

            state.answers = {};
            state.marked = {};
            state.timeRemaining =
                CONFIG.TOTAL_TIME;
        }
    }

    /* ========================================================
       INITIALIZATION
    ======================================================== */

    function init() {

        cacheDOM();

        /*
         * Load question bank first.
         */

        if (!loadQuestions()) {
            return;
        }

        prepareNewAttempt();

        loadStudent();

        restoreState();

        buildNavigator();

        setupEvents();

        setupBeforeUnload();

        setupExamIdentity();

        startAutoSave();

        renderQuestion();

        startTimer();

        console.log(
            "%cSMART SIX EXAM ENGINE READY",
            "color:#00e5ff;font-weight:bold;font-size:15px;"
        );

        console.log(
            `Questions: ${state.questions.length}`
        );

        console.log(
            `Time: ${formatTime(state.timeRemaining)}`
        );
    }

    /* ========================================================
       PUBLIC API
    ======================================================== */

    window.SMART_SIX_EXAM = {

        next: nextQuestion,

        previous: previousQuestion,

        goTo: goToQuestion,

        mark: toggleMark,

        finish: () =>
            finishExam("manual"),

        getState: () => ({
            currentIndex:
                state.currentIndex,

            answers:
                { ...state.answers },

            marked:
                { ...state.marked },

            timeRemaining:
                state.timeRemaining,

            answered:
                countAnswered(),

            unanswered:
                countUnanswered(),

            markedCount:
                countMarked()
        })
    };

    /* ========================================================
       START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();
    }

})();

