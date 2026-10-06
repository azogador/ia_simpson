document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       CONFIGURACIÓN GENERAL
    ========================================================== */

    const TOTAL_SCREENS = 18;

    const STORAGE_KEY = "ia_clase_progress_v2";


    /*
        Las claves quedan centralizadas acá.

        Ya NO dependen de textos escondidos
        en los botones del HTML.
    */

    const PASSWORDS = {

        alto1: "NUBE27",

        alto2: "FARO18",

        alto3: "MATE42"
    };


    const screens =
        [...document.querySelectorAll(".screen")];

    const sectionLabel =
        document.getElementById("sectionLabel");

    const screenCounter =
        document.getElementById("screenCounter");

    const progressBar =
        document.getElementById("progressBar");


    let currentScreen = 1;

    let timerInterval = null;


    /* =========================================================
       NORMALIZAR CLAVES
    ========================================================== */

    function normalizePassword(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase();
    }


    /* =========================================================
       PROGRESO LOCAL
    ========================================================== */

    function saveProgress() {

        try {

            localStorage.setItem(

                STORAGE_KEY,

                JSON.stringify({

                    screen: currentScreen
                })
            );

        } catch (error) {

            console.warn(
                "No se pudo guardar el progreso.",
                error
            );
        }
    }


    function loadProgress() {

        try {

            const raw =
                localStorage.getItem(STORAGE_KEY);

            if (!raw) {

                currentScreen = 1;

                return;
            }


            const saved =
                JSON.parse(raw);


            const number =
                Number(saved.screen);


            if (
                Number.isInteger(number) &&
                number >= 1 &&
                number <= TOTAL_SCREENS
            ) {

                currentScreen = number;

            } else {

                currentScreen = 1;
            }

        } catch (error) {

            currentScreen = 1;
        }
    }


    /* =========================================================
       BARRA DE PROGRESO
    ========================================================== */

    function updateProgress() {

        const percent =
            ((currentScreen - 1) /
            (TOTAL_SCREENS - 1)) *
            100;


        progressBar.style.width =
            `${percent}%`;


        screenCounter.textContent =
            `${currentScreen} de ${TOTAL_SCREENS}`;
    }


    /* =========================================================
       MOSTRAR PANTALLA
    ========================================================== */

    function showScreen(number) {

        clearInterval(timerInterval);


        const target =
            document.querySelector(
                `[data-screen="${number}"]`
            );


        if (!target) {

            console.warn(
                "Pantalla inexistente:",
                number
            );

            return;
        }


        screens.forEach(screen => {

            screen.classList.remove("active");
        });


        target.classList.add("active");


        currentScreen = number;


        sectionLabel.textContent =
            target.dataset.section || "INICIO";


        updateProgress();

        saveProgress();


        window.scrollTo({

            top: 0,

            behavior: "smooth"
        });


        prepareScreen(target);


        if (
            target.classList.contains(
                "quiz-screen"
            )
        ) {

            startTimer(target);
        }
    }


    /* =========================================================
       PREPARAR PANTALLA
    ========================================================== */

    function prepareScreen(screen) {

        /*
            Cada vez que entramos a una actividad,
            dejamos las respuestas listas.

            Esto es importante cuando estamos
            probando la web muchas veces.
        */


        if (
            screen.classList.contains(
                "quiz-screen"
            )
        ) {

            screen
                .querySelectorAll(".answer")
                .forEach(button => {

                    button.classList.remove(
                        "correct-selected",
                        "wrong-selected"
                    );
                });


            const feedback =
                screen.querySelector(".feedback");


            if (feedback) {

                feedback.textContent = "";

                feedback.className =
                    "feedback";
            }


            const oral =
                screen.querySelector(
                    ".oral-question"
                );


            if (oral) {

                oral.classList.add(
                    "hidden"
                );
            }


            const continueButton =
                screen.querySelector(
                    ".continue-btn"
                );


            if (continueButton) {

                continueButton.classList.add(
                    "hidden"
                );
            }
        }
    }


    /* =========================================================
       TEMPORIZADOR
    ========================================================== */

    function startTimer(screen) {

        clearInterval(timerInterval);


        const seconds =
            Number(
                screen.dataset.time || 0
            );


        const answers =
            screen.querySelectorAll(
                ".answer"
            );


        const message =
            screen.querySelector(
                ".timer-message"
            );


        if (!seconds) {

            answers.forEach(button => {

                button.disabled = false;
            });

            return;
        }


        let remaining =
            seconds;


        answers.forEach(button => {

            button.disabled = true;
        });


        updateTimerText();


        timerInterval =
            setInterval(() => {


                remaining--;


                if (remaining <= 0) {

                    clearInterval(
                        timerInterval
                    );


                    answers.forEach(button => {

                        button.disabled = false;
                    });


                    if (message) {

                        message.textContent =
                            "Ya podés responder.";
                    }


                    return;
                }


                updateTimerText();


            }, 1000);


        function updateTimerText() {

            if (!message) {

                return;
            }


            message.textContent =
                `Leé, pensá y conversá antes de responder. ${remaining} s`;
        }
    }


    /* =========================================================
       RESPUESTAS
    ========================================================== */

    document
        .querySelectorAll(".answer")
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const screen =
                        button.closest(
                            ".quiz-screen"
                        );


                    const feedback =
                        screen.querySelector(
                            ".feedback"
                        );


                    const continueButton =
                        screen.querySelector(
                            ".continue-btn"
                        );


                    const oralQuestion =
                        screen.querySelector(
                            ".oral-question"
                        );


                    const isCorrect =
                        button.dataset.correct ===
                        "true";


                    /*
                        Limpiamos selección anterior
                    */

                    screen
                        .querySelectorAll(
                            ".answer"
                        )
                        .forEach(answer => {

                            answer.classList.remove(
                                "correct-selected",
                                "wrong-selected"
                            );
                        });


                    feedback.textContent =
                        button.dataset.feedback ||
                        "";


                    feedback.classList.add(
                        "visible"
                    );


                    /* =========================
                       RESPUESTA CORRECTA
                    ========================== */

                    if (isCorrect) {


                        button.classList.add(
                            "correct-selected"
                        );


                        feedback.classList.remove(
                            "bad"
                        );


                        feedback.classList.add(
                            "good"
                        );


                        /*
                            Después de acertar,
                            bloqueamos las opciones.
                        */

                        screen
                            .querySelectorAll(
                                ".answer"
                            )
                            .forEach(answer => {

                                answer.disabled = true;
                            });


                        if (oralQuestion) {

                            oralQuestion.classList.remove(
                                "hidden"
                            );
                        }


                        if (continueButton) {

                            continueButton.classList.remove(
                                "hidden"
                            );
                        }


                    }


                    /* =========================
                       RESPUESTA INCORRECTA
                    ========================== */

                    else {


                        button.classList.add(
                            "wrong-selected"
                        );


                        feedback.classList.remove(
                            "good"
                        );


                        feedback.classList.add(
                            "bad"
                        );


                        /*
                            NO bloqueamos las demás opciones.

                            El estudiante lee
                            el feedback específico
                            y puede intentar nuevamente.
                        */
                    }
                }
            );
        });


    /* =========================================================
       BOTONES CONTINUAR
    ========================================================== */

    document
        .querySelectorAll(
            ".continue-btn"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    if (
                        currentScreen <
                        TOTAL_SCREENS
                    ) {

                        showScreen(
                            currentScreen + 1
                        );
                    }
                }
            );
        });


    /* =========================================================
       PORTADA
    ========================================================== */

    const startButton =
        document.querySelector(
            ".start-btn"
        );


    if (startButton) {


        startButton.addEventListener(
            "click",
            () => {

                showScreen(2);
            }
        );
    }


    /* =========================================================
       REVELACIONES DE LOS ALTOS
    ========================================================== */

    document
        .querySelectorAll(
            ".reveal-btn"
        )
        .forEach(button => {


            button.addEventListener(
                "click",
                () => {


                    const targetId =
                        button.dataset.reveal;


                    const target =
                        document.getElementById(
                            targetId
                        );


                    if (!target) {

                        return;
                    }


                    target.classList.remove(
                        "hidden"
                    );


                    button.classList.add(
                        "hidden"
                    );


                    handleStopReveal(
                        targetId
                    );
                }
            );
        });


    function handleStopReveal(id) {


        /* =====================================================
           ALTO 1
        ====================================================== */

        if (id === "alto1-a") {

            showRevealButton(
                "alto1-b"
            );
        }


        if (id === "alto1-b") {


            const summary =
                document.getElementById(
                    "alto1-summary"
                );


            summary.classList.remove(
                "hidden"
            );


            showPasswordArea(
                summary
            );
        }


        /* =====================================================
           ALTO 2
        ====================================================== */

        if (id === "alto2-a") {

            showRevealButton(
                "alto2-b"
            );
        }


        if (id === "alto2-b") {


            const summary =
                document.getElementById(
                    "alto2-summary"
                );


            summary.classList.remove(
                "hidden"
            );


            showPasswordArea(
                summary
            );
        }


        /* =====================================================
           ALTO 3
        ====================================================== */

        if (id === "alto3-a") {


            const summary =
                document.getElementById(
                    "alto3-summary"
                );


            summary.classList.remove(
                "hidden"
            );


            showPasswordArea(
                summary
            );
        }
    }


    function showRevealButton(targetId) {


        const target =
            document.getElementById(
                targetId
            );


        if (!target) {

            return;
        }


        const card =
            target.closest(
                ".stop-card"
            );


        const button =
            [...card.querySelectorAll(
                ".reveal-btn"
            )]
            .find(button =>

                button.dataset.reveal ===
                targetId
            );


        if (button) {

            button.classList.remove(
                "hidden"
            );
        }
    }


    function showPasswordArea(element) {


        const card =
            element.closest(
                ".stop-card"
            );


        const area =
            card.querySelector(
                ".password-area"
            );


        if (area) {

            area.classList.remove(
                "hidden"
            );


            const input =
                area.querySelector(
                    ".password-input"
                );


            if (input) {

                setTimeout(
                    () => input.focus(),
                    100
                );
            }
        }
    }


    /* =========================================================
       CONTRASEÑAS
    ========================================================== */

    document
        .querySelectorAll(
            ".password-area"
        )
        .forEach(area => {


            const button =
                area.querySelector(
                    ".password-btn"
                );


            const input =
                area.querySelector(
                    ".password-input"
                );


            button.addEventListener(
                "click",
                () => {

                    checkPassword(
                        area
                    );
                }
            );


            input.addEventListener(
                "keydown",
                event => {


                    if (
                        event.key ===
                        "Enter"
                    ) {

                        checkPassword(
                            area
                        );
                    }
                }
            );
        });


    function checkPassword(area) {


        const lockName =
            area.dataset.lock;


        const expected =
            normalizePassword(
                PASSWORDS[lockName]
            );


        const input =
            area.querySelector(
                ".password-input"
            );


        const message =
            area.querySelector(
                ".password-feedback"
            );


        const entered =
            normalizePassword(
                input.value
            );


        /*
            Campo vacío
        */

        if (!entered) {


            message.textContent =
                "Escribí la clave que indique el docente.";


            message.className =
                "password-feedback error";


            input.focus();

            return;
        }


        /*
            Clave correcta
        */

        if (
            entered === expected
        ) {


            message.textContent =
                "Clave correcta. Continuamos.";


            message.className =
                "password-feedback success";


            input.disabled =
                true;


            const button =
                area.querySelector(
                    ".password-btn"
                );


            button.disabled =
                true;


            setTimeout(
                () => {


                    if (
                        currentScreen <
                        TOTAL_SCREENS
                    ) {

                        showScreen(
                            currentScreen + 1
                        );
                    }

                },
                600
            );


            return;
        }


        /*
            Clave incorrecta
        */

        message.textContent =
            "Esa no es la clave. Esperá la indicación del docente y volvé a intentarlo.";


        message.className =
            "password-feedback error";


        input.value = "";

        input.focus();
    }


    /* =========================================================
       CIERRE
    ========================================================== */

    const finalReveal =
        document.querySelector(
            ".final-reveal-btn"
        );


    if (finalReveal) {


        finalReveal.addEventListener(
            "click",
            () => {


                const ideas =
                    document.querySelector(
                        ".final-ideas"
                    );


                ideas.classList.remove(
                    "hidden"
                );


                finalReveal.classList.add(
                    "hidden"
                );
            }
        );
    }


    /* =========================================================
       REINICIO DOCENTE

       CTRL + SHIFT + R

       Lo dejamos para las pruebas
       y para volver a empezar la clase.
    ========================================================== */

    document.addEventListener(
        "keydown",
        event => {


            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() ===
                "r"
            ) {


                event.preventDefault();


                const reset =
                    confirm(
                        "¿Reiniciar la actividad desde el comienzo?"
                    );


                if (reset) {


                    try {

                        localStorage.removeItem(
                            STORAGE_KEY
                        );

                    } catch (error) {

                        console.warn(
                            error
                        );
                    }


                    window.location.reload();
                }
            }
        }
    );


    /* =========================================================
       INICIALIZACIÓN
    ========================================================== */

    loadProgress();

    showScreen(
        currentScreen
    );

});