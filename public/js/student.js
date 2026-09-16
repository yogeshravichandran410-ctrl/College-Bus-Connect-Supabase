// ==================================================
// LOAD STUDENT DASHBOARD
// ==================================================

async function load() {

    try {

        const response =
            await fetch("/api/student");


        // ------------------------------------------
        // NOT LOGGED IN
        // ------------------------------------------

        if (!response.ok) {

            location.href =
                "login.html";

            return;
        }


        const data =
            await response.json();


        // ------------------------------------------
        // CHECK ROUTE STATUS
        // ------------------------------------------

        if (!data.routeActive) {

            showLockedPage(
                data.routeStatus
            );

            return;
        }


        // ------------------------------------------
        // ROUTE IS ACTIVE
        // ------------------------------------------

        showStudentPage(
            data
        );


    } catch (error) {

        console.error(
            "STUDENT LOAD ERROR:",
            error
        );

        document.getElementById(
            "lockedMessage"
        ).textContent =
            "Unable to connect to the server.";

        document.getElementById(
            "lockedSection"
        ).style.display =
            "block";

    }

}


// ==================================================
// SHOW LOCKED PAGE
// ==================================================

function showLockedPage(routeStatus) {

    // Hide student home
    document.getElementById(
        "homeSection"
    ).style.display =
        "none";


    // Hide GPS
    document.getElementById(
        "gpsSection"
    ).style.display =
        "none";


    // Hide GPS button
    document.getElementById(
        "gpsBtn"
    ).style.display =
        "none";


    // Show locked section
    document.getElementById(
        "lockedSection"
    ).style.display =
        "block";


    const message =
        document.getElementById(
            "lockedMessage"
        );


    // ------------------------------------------
    // ROUTE NOT STARTED
    // ------------------------------------------

    if (
        routeStatus === "not_started"
    ) {

        message.textContent =
            "The driver has not started today's route yet.";

    }


    // ------------------------------------------
    // ROUTE COMPLETED
    // ------------------------------------------

    else if (
        routeStatus === "completed"
    ) {

        message.textContent =
            "Today's route has been completed.";

    }


    // ------------------------------------------
    // OTHER STATUS
    // ------------------------------------------

    else {

        message.textContent =
            "The student portal is currently unavailable.";

    }

}


// ==================================================
// SHOW STUDENT PAGE
// ==================================================

function showStudentPage(data) {

    // ------------------------------------------
    // Hide locked page
    // ------------------------------------------

    document.getElementById(
        "lockedSection"
    ).style.display =
        "none";


    // ------------------------------------------
    // Show home
    // ------------------------------------------

    document.getElementById(
        "homeSection"
    ).style.display =
        "block";


    // ------------------------------------------
    // Enable GPS
    // ------------------------------------------

    document.getElementById(
        "gpsBtn"
    ).style.display =
        "inline-block";


    // ------------------------------------------
    // STUDENT NAME
    // ------------------------------------------

    document.getElementById(
        "name"
    ).textContent =
        "Welcome, " +
        data.student.name +
        " 👋";


    // ------------------------------------------
    // STUDENT INFORMATION
    // ------------------------------------------

    document.getElementById(
        "info"
    ).textContent =
        "Bus " +
        data.student.bus_number +
        " • " +
        data.student.route_name;


    // ------------------------------------------
    // STUDENT STOP
    // ------------------------------------------

    document.getElementById(
        "stop"
    ).textContent =
        "📍 " +
        data.student.stop_name +
        " • " +
        data.student.expected_time.slice(0, 5);


    // ------------------------------------------
    // CURRENT STATUS
    // ------------------------------------------

    document.getElementById(
        "msg"
    ).textContent =
        "Current: " +
        data.today.travel_status +
        " • " +
        data.today.stop_status;

}


// ==================================================
// UPDATE STUDENT STATUS
// ==================================================

async function setStatus(
    key,
    value
) {

    const message =
        document.getElementById(
            "msg"
        );


    try {

        // ------------------------------------------
        // SEND STATUS TO SERVER
        // ------------------------------------------

        const body = {};

        body[key] =
            value;


        const response =
            await fetch(
                "/api/student/status",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(body)
                }
            );


        const data =
            await response.json();


        // ------------------------------------------
        // DISPLAY SERVER MESSAGE
        // ------------------------------------------

        message.textContent =
            data.message;


        // ------------------------------------------
        // IF ROUTE BECAME INACTIVE
        // ------------------------------------------

        if (
            response.status === 403
        ) {

            await load();

            return;
        }


        // ------------------------------------------
        // REFRESH STATUS
        // ------------------------------------------

        if (response.ok) {

            await load();

        }

    } catch (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );

        message.textContent =
            "Unable to update status.";

    }

}


// ==================================================
// LOGOUT
// ==================================================

async function logout() {

    try {

        await fetch(
            "/api/logout",
            {
                method: "POST"
            }
        );

    } finally {

        location.href =
            "login.html";

    }

}


// ==================================================
// START
// ==================================================

load();