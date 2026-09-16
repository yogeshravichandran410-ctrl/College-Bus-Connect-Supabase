async function load() {

    try {

        const r = await fetch("/api/driver");

        if (!r.ok) {
            location.href = "login.html";
            return;
        }

        const d = await r.json();


        // --------------------------------------------
        // DRIVER INFORMATION
        // --------------------------------------------

        document.getElementById("driver").textContent =
            "Driver " +
            d.driver.name +
            " • Bus " +
            d.driver.bus_number;


        // --------------------------------------------
        // ROUTE STATUS
        // --------------------------------------------

        const routeStatus =
            document.getElementById("routeStatus");

        const startBtn =
            document.getElementById("startBtn");

        const completeBtn =
            document.getElementById("completeBtn");


        // --------------------------------------------
        // ROUTE NOT STARTED
        // --------------------------------------------

        if (d.routeStatus === "not_started") {

            routeStatus.textContent =
                "🔴 Today's route has not started.";

            startBtn.style.display =
                "inline-block";

            completeBtn.style.display =
                "none";

        }


        // --------------------------------------------
        // ROUTE ACTIVE
        // --------------------------------------------

        else if (d.routeStatus === "started") {

            routeStatus.textContent =
                "🟢 Today's route is ACTIVE.";

            startBtn.style.display =
                "none";

            completeBtn.style.display =
                "inline-block";

        }


        // --------------------------------------------
        // ROUTE COMPLETED
        // --------------------------------------------

        else if (d.routeStatus === "completed") {

            routeStatus.textContent =
                "🏁 Today's route is COMPLETED.";

            startBtn.style.display =
                "none";

            completeBtn.style.display =
                "none";

        }


        // --------------------------------------------
        // STOPS
        // --------------------------------------------

        document.getElementById("stops").innerHTML =
            d.stops.map(s => `

                <div class="card stop">

                    <div>

                        <b>
                            ${s.stop_order}.
                            ${s.stop_name}
                        </b>

                        <p>
                            ${s.expected_time.slice(0, 5)}
                            • 🟢 ${s.at_stop} at stop
                            • 🟡 ${s.coming} coming
                            • 👥 ${s.going} going
                        </p>

                    </div>


                    <button
                        onclick="complete(${s.id}, this)"
                        ${!d.routeActive ? "disabled" : ""}
                    >
                        ${d.routeActive
                            ? "Complete stop"
                            : "Route not started"}
                    </button>

                </div>

            `).join("");


        // --------------------------------------------
        // STUDENTS
        // --------------------------------------------

        if (d.routeActive) {

            document.getElementById("studentInfo").textContent =
                "🟢 Students can update their status.";

        } else if (d.routeStatus === "completed") {

            document.getElementById("studentInfo").textContent =
                "🏁 Today's student status has been cleared.";

        } else {

            document.getElementById("studentInfo").textContent =
                "🔴 Student status will appear after the driver starts the route.";

        }


        document.getElementById("students").innerHTML =
            d.students.map(s => `

                <tr>

                    <td>
                        ${s.name}
                    </td>

                    <td>
                        ${s.stop_name}
                    </td>

                    <td>
                        ${s.travel_status}
                    </td>

                    <td>
                        ${s.stop_status}
                    </td>

                </tr>

            `).join("");


    } catch (error) {

        console.error(
            "DRIVER LOAD ERROR:",
            error
        );

        document.getElementById("msg").textContent =
            "Unable to load driver dashboard.";

    }

}


// ==================================================
// START TODAY'S ROUTE
// ==================================================

async function start() {

    const startBtn =
        document.getElementById("startBtn");

    const msg =
        document.getElementById("msg");


    startBtn.disabled = true;

    msg.textContent =
        "Starting today's route...";


    try {

        const response =
            await fetch(
                "/api/driver/start",
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        msg.textContent =
            data.message;


        if (response.ok) {

            await load();

        } else {

            startBtn.disabled = false;

        }

    } catch (error) {

        console.error(
            "START ROUTE ERROR:",
            error
        );

        msg.textContent =
            "Unable to start today's route.";

        startBtn.disabled = false;
    }

}


// ==================================================
// COMPLETE STOP
// ==================================================

async function complete(id, button) {

    if (!confirm(
        "Are you sure you want to complete this stop?"
    )) {
        return;
    }


    button.disabled = true;


    try {

        const response =
            await fetch(
                "/api/driver/stop/" + id,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        document.getElementById("msg").textContent =
            data.message;


        if (response.ok) {

            button.textContent =
                "Completed";

        } else {

            button.disabled = false;

        }

    } catch (error) {

        console.error(
            "COMPLETE STOP ERROR:",
            error
        );

        document.getElementById("msg").textContent =
            "Unable to complete stop.";

        button.disabled = false;
    }

}


// ==================================================
// COMPLETE TODAY'S ROUTE
// ==================================================

async function completeRoute() {

    const completeBtn =
        document.getElementById("completeBtn");

    const msg =
        document.getElementById("msg");


    const confirmed =
        confirm(
            "Are you sure you want to complete today's route?\n\n" +
            "After completing the route, today's student status " +
            "details will be deleted and students will be locked."
        );


    if (!confirmed) {
        return;
    }


    completeBtn.disabled = true;

    msg.textContent =
        "Completing today's route...";


    try {

        const response =
            await fetch(
                "/api/driver/complete",
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        msg.textContent =
            data.message;


        if (response.ok) {

            await load();

        } else {

            completeBtn.disabled = false;

        }

    } catch (error) {

        console.error(
            "COMPLETE ROUTE ERROR:",
            error
        );

        msg.textContent =
            "Unable to complete today's route.";

        completeBtn.disabled = false;
    }

}


// ==================================================
// LOGOUT
// ==================================================

async function logout() {

    await fetch(
        "/api/logout",
        {
            method: "POST"
        }
    );

    location.href =
        "login.html";
}


// ==================================================
// LOAD DRIVER PAGE
// ==================================================

load();