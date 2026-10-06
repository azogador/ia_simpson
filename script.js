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

    /* =========================================================
       REGISTRO DE EVALUACIÓN
    ========================================================== */

    const RECORD_ENDPOINT =
        "https://script.google.com/macros/s/AKfycbzJEJirlqLF2ssFZLavaQrOOFjxX5DvXVqmzZ-7dj8yX2t2lAJ-Vq4zDcIPhIE4VkjvFQ/exec";

    const GROUP_NAME = "8.º 1";
    const EVALUATION_KEY = "ia_clase_evaluation_v1";

    const ACTIVITY_MAP = {
        2:{id:"R1",name:"Recomendaciones de YouTube"},
        3:{id:"R2",name:"Predicción del teclado"},
        4:{id:"R3",name:"Enemigo de videojuego"},
        5:{id:"R4",name:"El ascensor"},
        7:{id:"A1",name:"Representatividad de los datos"},
        8:{id:"A2",name:"Causa del error"},
        9:{id:"A3",name:"Consecuencias del error"},
        11:{id:"D1",name:"Ubicación en tiempo real"},
        12:{id:"D2",name:"Lista de contactos"},
        13:{id:"D3",name:"Beneficio y riesgo"},
        15:{id:"I1",name:"Integrar: reconocer IA"},
        16:{id:"I2",name:"Integrar: representatividad"},
        17:{id:"I3",name:"Integrar: privacidad"}
    };

    const ERROR_CODE_MAP = {
        2:[null,"AUT_REGLAS","IA_DUDA_DATOS"],
        3:[null,"AUT_REGLAS","IA_DUDA_DATOS"],
        4:["AUT_DECISION",null,"AUT_AUTONOMIA"],
        5:["AUT_DECISION",null,"AUT_RESPUESTA"],
        7:["DAT_CANTIDAD",null,"DAT_CALIDAD","DAT_GRUPO"],
        8:[null,"IA_INEVITABLE","DAT_GRUPO","IA_INTENCION"],
        9:["CON_TECNICA","CON_TECNICA",null,"CON_TECNICA"],
        11:["PRI_ACEPTAR","PRI_RECHAZAR",null],
        12:["PRI_ACEPTAR",null,"PRI_TERCEROS"],
        13:["PRI_BENEFICIO","PRI_RECHAZAR",null],
        15:["AUT_RESPUESTA",null,"AUT_AUTONOMIA","IA_CONTEXTO"],
        16:["DAT_GRUPO",null,"CON_TECNICA","IA_CONTEXTO"],
        17:["PRI_ACEPTAR","PRI_RECHAZAR",null,"PRI_CONFIANZA"]
    };

    let screenStartedAt = Date.now();
    let evaluationState = { team:"", attempts:{}, totalErrors:0, firstAttemptCorrect:0, errorCodes:[], summarySent:false };



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
       ESTADO Y ENVÍO DEL REGISTRO
    ========================================================== */

    function saveEvaluationState() {
        try { localStorage.setItem(EVALUATION_KEY, JSON.stringify(evaluationState)); }
        catch (error) { console.warn("No se pudo guardar el estado de evaluación.", error); }
    }

    function loadEvaluationState() {
        try {
            const raw = localStorage.getItem(EVALUATION_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            evaluationState = { ...evaluationState, ...saved, attempts:saved.attempts||{}, errorCodes:saved.errorCodes||[] };
        } catch (error) { console.warn("No se pudo recuperar el estado de evaluación.", error); }
    }

    function cleanText(value) { return String(value||"").replace(/\s+/g," ").trim(); }

    function sendRecord(payload) {
        if (!RECORD_ENDPOINT) return;
        fetch(RECORD_ENDPOINT,{
            method:"POST", mode:"no-cors",
            headers:{"Content-Type":"text/plain;charset=UTF-8"},
            body:JSON.stringify(payload), keepalive:true
        }).catch(error=>console.warn("No se pudo enviar el registro.",error));
    }

    function registerAnswer(screen, button, isCorrect) {
        const screenNumber = Number(screen.dataset.screen);
        const activity = ACTIVITY_MAP[screenNumber];
        if (!activity || !evaluationState.team) return;

        const buttons = [...screen.querySelectorAll(".answer")];
        const optionIndex = buttons.indexOf(button);
        const nextAttempt = (evaluationState.attempts[activity.id]||0)+1;
        evaluationState.attempts[activity.id] = nextAttempt;

        let errorCode = "";
        if (isCorrect) {
            if (nextAttempt === 1) evaluationState.firstAttemptCorrect++;
        } else {
            evaluationState.totalErrors++;
            errorCode = (ERROR_CODE_MAP[screenNumber]||[])[optionIndex] || "ERROR_CONCEPTUAL";
            evaluationState.errorCodes.push(errorCode);
        }
        saveEvaluationState();

        const elapsedSeconds = Math.max(0,Math.round((Date.now()-screenStartedAt)/1000));
        sendRecord({
            action:"event", grupo:GROUP_NAME, equipo:evaluationState.team,
            pantalla:screenNumber, bloque:screen.dataset.section||"",
            actividad:`${activity.id} - ${activity.name}`,
            opcion:cleanText(button.textContent), correcta:isCorrect, intento:nextAttempt,
            codigoError:errorCode, tiempo:elapsedSeconds
        });
    }

    function sendFinalSummary(force = false) {
        if (!evaluationState.team) return;
        if (evaluationState.summarySent && !force) return;

        const payload = {
            action:"complete",
            grupo:GROUP_NAME,
            equipo:evaluationState.team,
            intentos:evaluationState.attempts,
            primerIntento:evaluationState.firstAttemptCorrect,
            totalErrores:evaluationState.totalErrors,
            erroresConceptuales:[...new Set(evaluationState.errorCodes)]
        };

        /*
            Apps Script se consume con mode:"no-cors", por lo que el navegador
            no puede confirmar la respuesta. Para evitar depender de F5,
            enviamos el resumen al entrar al cierre y hacemos dos reintentos
            automáticos. En la hoja no duplica equipos: Apps Script actualiza
            la fila existente del mismo equipo.
        */
        sendRecord(payload);

        setTimeout(() => sendRecord(payload), 900);
        setTimeout(() => sendRecord(payload), 2500);

        evaluationState.summarySent = true;
        saveEvaluationState();
    }


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

        screenStartedAt = Date.now();

        if (number === TOTAL_SCREENS) {
            sendFinalSummary();
        }

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


                    registerAnswer(screen, button, isCorrect);


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

                        /*
                            Si estamos saliendo de la pantalla 17,
                            enviamos el resumen ANTES de entrar al cierre.
                        */
                        if (currentScreen === 17) {
                            sendFinalSummary(true);
                        }

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

        const teamInput = document.getElementById("teamName");
        const teamError = document.getElementById("teamError");

        if (teamInput && evaluationState.team) {
            teamInput.value = evaluationState.team;
        }

        startButton.addEventListener("click", () => {
            const teamName = cleanText(teamInput ? teamInput.value : "");

            if (!teamName) {
                if (teamError) teamError.textContent = "Escriban el nombre o número del equipo antes de comenzar.";
                if (teamInput) teamInput.focus();
                return;
            }

            if (teamError) teamError.textContent = "";

            if (evaluationState.team && evaluationState.team !== teamName) {
                evaluationState = { team:teamName, attempts:{}, totalErrors:0, firstAttemptCorrect:0, errorCodes:[], summarySent:false };
            } else {
                evaluationState.team = teamName;
            }

            saveEvaluationState();
            showScreen(2);
        });
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

                        localStorage.removeItem(EVALUATION_KEY);

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

    loadEvaluationState();

    loadProgress();

    if (currentScreen > 1 && !evaluationState.team) {
        currentScreen = 1;
    }

    showScreen(
        currentScreen
    );

    /*
        Si la página se abrió o recargó directamente en el cierre,
        hacemos un envío forzado adicional. Es seguro porque el servidor
        actualiza la fila del equipo en lugar de crear duplicados.
    */
    if (currentScreen === TOTAL_SCREENS) {
        setTimeout(() => sendFinalSummary(true), 1200);
    }

});
