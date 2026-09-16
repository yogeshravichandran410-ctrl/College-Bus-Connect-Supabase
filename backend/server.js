const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const db = require("./db");

const app = express();

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

// --------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------

const auth = (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  return res.status(401).json({
    message: "Please log in.",
  });
};

const role = (requiredRole) => (req, res, next) => {
  if (req.session.user?.role === requiredRole) {
    return next();
  }

  return res.status(403).json({
    message: "Access denied.",
  });
};

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post("/api/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    const { rows } = await db.query(
      `
      SELECT id,user_code,name,password_hash,role,active
      FROM users
      WHERE user_code=$1
      LIMIT 1
      `,
      [String(userId || "").trim()]
    );

    if (
      !rows.length ||
      !rows[0].active ||
      !(await bcrypt.compare(
        password || "",
        rows[0].password_hash
      ))
    ) {
      return res.status(401).json({
        message: "Invalid ID or password.",
      });
    }

    req.session.user = {
      id: rows[0].id,
      userCode: rows[0].user_code,
      name: rows[0].name,
      role: rows[0].role,
    };

    res.json({
      user: req.session.user,
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);

    res.status(500).json({
      message: "Server error.",
    });
  }
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true,
    });
  });
});

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

app.get("/api/me", (req, res) => {
  res.json({
    user: req.session.user || null,
  });
});

// ==================================================
// STUDENT
// ==================================================

// --------------------------------------------------
// GET STUDENT DETAILS
// --------------------------------------------------

app.get(
  "/api/student",
  auth,
  role("student"),
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `
        SELECT
          s.id,
          u.name,
          u.user_code,
          b.bus_number,
          b.id AS bus_id,
          bs.stop_name,
          bs.expected_time,
          r.route_name
        FROM students s
        JOIN users u ON u.id=s.user_id
        JOIN buses b ON b.id=s.bus_id
        JOIN bus_stops bs ON bs.id=s.stop_id
        JOIN routes r ON r.id=b.route_id
        WHERE s.user_id=$1
        `,
        [req.session.user.id]
      );

      const student = rows[0];

      if (!student) {
        return res.status(404).json({
          message: "Student profile not found.",
        });
      }

      // ------------------------------------------------
      // CHECK TODAY'S ROUTE
      // ------------------------------------------------

      const routeResult = await db.query(
        `
        SELECT
          rr.status,
          rr.started_at
        FROM route_runs rr
        JOIN drivers d ON d.id=rr.driver_id
        WHERE d.bus_id=$1
          AND rr.run_date=CURRENT_DATE
        ORDER BY rr.id DESC
        LIMIT 1
        `,
        [student.bus_id]
      );

      const route = routeResult.rows[0];

      const routeActive =
        route && route.status === "started";

      const routeStatus =
        route?.status || "not_started";

      // ------------------------------------------------
      // GET TODAY'S STUDENT STATUS
      // ------------------------------------------------

      const todayResult = await db.query(
        `
        SELECT
          travel_status,
          stop_status,
          updated_at
        FROM daily_status
        WHERE student_id=$1
          AND status_date=CURRENT_DATE
        `,
        [student.id]
      );

      res.json({
        student,
        routeActive,
        routeStatus,
        routeStartedAt: route?.started_at || null,

        today:
          todayResult.rows[0] || {
            travel_status: "not_confirmed",
            stop_status: "not_marked",
          },
      });
    } catch (e) {
      console.error("STUDENT ERROR:", e);

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// STUDENT STATUS
// --------------------------------------------------

app.post(
  "/api/student/status",
  auth,
  role("student"),
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `
        SELECT
          s.id,
          s.bus_id
        FROM students s
        WHERE s.user_id=$1
        `,
        [req.session.user.id]
      );

      const student = rows[0];

      if (!student) {
        return res.status(404).json({
          message: "Student profile not found.",
        });
      }

      // ------------------------------------------------
      // CHECK WHETHER DRIVER STARTED TODAY'S ROUTE
      // ------------------------------------------------

      const routeResult = await db.query(
        `
        SELECT rr.status
        FROM route_runs rr
        JOIN drivers d ON d.id=rr.driver_id
        WHERE d.bus_id=$1
          AND rr.run_date=CURRENT_DATE
        ORDER BY rr.id DESC
        LIMIT 1
        `,
        [student.bus_id]
      );

      const route = routeResult.rows[0];

      if (!route || route.status !== "started") {
        return res.status(403).json({
          message:
            "Today's route has not been started by the driver.",
        });
      }

      const { travelStatus, stopStatus } = req.body;

      // ------------------------------------------------
      // SAVE TODAY'S STATUS
      // ------------------------------------------------

      await db.query(
        `
        INSERT INTO daily_status(
          student_id,
          status_date,
          travel_status,
          stop_status
        )
        VALUES(
          $1,
          CURRENT_DATE,
          COALESCE($2,'not_confirmed'),
          COALESCE($3,'not_marked')
        )

        ON CONFLICT(student_id,status_date)
        DO UPDATE SET

          travel_status =
            COALESCE(
              EXCLUDED.travel_status,
              daily_status.travel_status
            ),

          stop_status =
            COALESCE(
              EXCLUDED.stop_status,
              daily_status.stop_status
            ),

          updated_at=CURRENT_TIMESTAMP
        `,
        [
          student.id,
          travelStatus || null,
          stopStatus || null,
        ]
      );

      res.json({
        message: "Status updated successfully.",
      });
    } catch (e) {
      console.error(
        "STUDENT STATUS ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// ==================================================
// DRIVER
// ==================================================

// --------------------------------------------------
// GET DRIVER DASHBOARD
// --------------------------------------------------

app.get(
  "/api/driver",
  auth,
  role("driver"),
  async (req, res) => {
    try {
      const { rows: drows } = await db.query(
        `
        SELECT
          d.id,
          d.bus_id,
          b.bus_number,
          r.route_name,
          u.name
        FROM drivers d
        JOIN users u ON u.id=d.user_id
        JOIN buses b ON b.id=d.bus_id
        JOIN routes r ON r.id=b.route_id
        WHERE d.user_id=$1
          AND d.active=TRUE
        `,
        [req.session.user.id]
      );

      const d = drows[0];

      if (!d) {
        return res.status(404).json({
          message: "Driver profile not found.",
        });
      }

      // ------------------------------------------------
      // TODAY'S ROUTE STATUS
      // ------------------------------------------------

      const routeResult = await db.query(
        `
        SELECT
          status,
          started_at
        FROM route_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        LIMIT 1
        `,
        [d.id]
      );

      const route = routeResult.rows[0];

      const routeStatus =
        route?.status || "not_started";

      const routeActive =
        routeStatus === "started";

      // ------------------------------------------------
      // STOPS
      // ------------------------------------------------

      const { rows: stops } = await db.query(
        `
        SELECT
          bs.id,
          bs.stop_order,
          bs.stop_name,
          bs.expected_time,

          COUNT(*) FILTER (
            WHERE ds.stop_status='at_stop'
          )::int AS at_stop,

          COUNT(*) FILTER (
            WHERE ds.stop_status='coming'
          )::int AS coming,

          COUNT(*) FILTER (
            WHERE ds.travel_status='going'
          )::int AS going

        FROM bus_stops bs

        LEFT JOIN students s
          ON s.stop_id=bs.id
          AND s.bus_id=$1

        LEFT JOIN daily_status ds
          ON ds.student_id=s.id
          AND ds.status_date=CURRENT_DATE

        WHERE bs.route_id=(
          SELECT route_id
          FROM buses
          WHERE id=$2
        )

        GROUP BY
          bs.id

        ORDER BY
          bs.stop_order
        `,
        [d.bus_id, d.bus_id]
      );

      // ------------------------------------------------
      // STUDENTS
      // ------------------------------------------------

      const { rows: students } = await db.query(
        `
        SELECT
          u.name,
          bs.stop_name,

          COALESCE(
            ds.travel_status,
            'not_confirmed'
          ) AS travel_status,

          COALESCE(
            ds.stop_status,
            'not_marked'
          ) AS stop_status

        FROM students s

        JOIN users u
          ON u.id=s.user_id

        JOIN bus_stops bs
          ON bs.id=s.stop_id

        LEFT JOIN daily_status ds
          ON ds.student_id=s.id
          AND ds.status_date=CURRENT_DATE

        WHERE s.bus_id=$1

        ORDER BY
          bs.stop_order,
          u.name
        `,
        [d.bus_id]
      );

      res.json({
        driver: d,
        routeStatus,
        routeActive,
        routeStartedAt:
          route?.started_at || null,
        stops,
        students,
      });
    } catch (e) {
      console.error(
        "DRIVER ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// START TODAY'S ROUTE
// --------------------------------------------------

app.post(
  "/api/driver/start",
  auth,
  role("driver"),
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `
        SELECT
          id,
          bus_id
        FROM drivers
        WHERE user_id=$1
          AND active=TRUE
        `,
        [req.session.user.id]
      );

      const driver = rows[0];

      if (!driver) {
        return res.status(404).json({
          message: "Driver profile not found.",
        });
      }

      // ------------------------------------------------
      // CHECK WHETHER TODAY'S ROUTE ALREADY EXISTS
      // ------------------------------------------------

      const existingResult = await db.query(
        `
        SELECT
          status
        FROM route_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        LIMIT 1
        `,
        [driver.id]
      );

      const existing =
        existingResult.rows[0];

      // ------------------------------------------------
      // PREVENT RESTART AFTER COMPLETION
      // ------------------------------------------------

      if (
        existing &&
        existing.status === "completed"
      ) {
        return res.status(400).json({
          message:
            "Today's route is already completed. A new route can start tomorrow.",
        });
      }

      // ------------------------------------------------
      // ALREADY STARTED
      // ------------------------------------------------

      if (
        existing &&
        existing.status === "started"
      ) {
        return res.json({
          message:
            "Today's route is already active.",
        });
      }

      // ------------------------------------------------
      // REMOVE ANY OLD TODAY STATUS
      // ------------------------------------------------

      await db.query(
        `
        DELETE FROM daily_status
        WHERE status_date=CURRENT_DATE
          AND student_id IN (
            SELECT id
            FROM students
            WHERE bus_id=$1
          )
        `,
        [driver.bus_id]
      );

      // ------------------------------------------------
      // REMOVE OLD TODAY STOP RECORDS
      // ------------------------------------------------

      await db.query(
        `
        DELETE FROM stop_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        `,
        [driver.id]
      );

      // ------------------------------------------------
      // CREATE TODAY'S ROUTE
      // ------------------------------------------------

      await db.query(
        `
        INSERT INTO route_runs(
          driver_id,
          run_date,
          status,
          started_at
        )
        VALUES(
          $1,
          CURRENT_DATE,
          'started',
          CURRENT_TIMESTAMP
        )
        `,
        [driver.id]
      );

      res.json({
        message:
          "Today's route started. Students can now use the portal.",
      });
    } catch (e) {
      console.error(
        "DRIVER START ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// COMPLETE STOP
// --------------------------------------------------

app.post(
  "/api/driver/stop/:id",
  auth,
  role("driver"),
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `
        SELECT
          id
        FROM drivers
        WHERE user_id=$1
          AND active=TRUE
        `,
        [req.session.user.id]
      );

      const driver = rows[0];

      if (!driver) {
        return res.status(404).json({
          message: "Driver profile not found.",
        });
      }

      // Check route is active
      const routeResult = await db.query(
        `
        SELECT status
        FROM route_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        LIMIT 1
        `,
        [driver.id]
      );

      if (
        !routeResult.rows.length ||
        routeResult.rows[0].status !== "started"
      ) {
        return res.status(400).json({
          message:
            "Start today's route before completing stops.",
        });
      }

      await db.query(
        `
        INSERT INTO stop_runs(
          driver_id,
          stop_id,
          run_date,
          status,
          completed_at
        )
        VALUES(
          $1,
          $2,
          CURRENT_DATE,
          'completed',
          CURRENT_TIMESTAMP
        )

        ON CONFLICT(
          driver_id,
          stop_id,
          run_date
        )

        DO UPDATE SET
          status='completed',
          completed_at=CURRENT_TIMESTAMP
        `,
        [driver.id, req.params.id]
      );

      res.json({
        message: "Stop marked completed.",
      });
    } catch (e) {
      console.error(
        "DRIVER STOP ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// COMPLETE TODAY'S ROUTE
// --------------------------------------------------

app.post(
  "/api/driver/complete",
  auth,
  role("driver"),
  async (req, res) => {
    const client = await db.connect();

    try {
      // ------------------------------------------------
      // GET DRIVER
      // ------------------------------------------------

      const driverResult = await client.query(
        `
        SELECT
          id,
          bus_id
        FROM drivers
        WHERE user_id=$1
          AND active=TRUE
        `,
        [req.session.user.id]
      );

      const driver = driverResult.rows[0];

      if (!driver) {
        client.release();

        return res.status(404).json({
          message:
            "Driver profile not found.",
        });
      }

      // ------------------------------------------------
      // CHECK ROUTE
      // ------------------------------------------------

      const routeResult = await client.query(
        `
        SELECT
          id,
          status
        FROM route_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        LIMIT 1
        `,
        [driver.id]
      );

      const route = routeResult.rows[0];

      if (!route) {
        client.release();

        return res.status(400).json({
          message:
            "Today's route has not been started.",
        });
      }

      if (route.status === "completed") {
        client.release();

        return res.status(400).json({
          message:
            "Today's route is already completed.",
        });
      }

      if (route.status !== "started") {
        client.release();

        return res.status(400).json({
          message:
            "Today's route is not active.",
        });
      }

      // ------------------------------------------------
      // START DATABASE TRANSACTION
      // ------------------------------------------------

      await client.query("BEGIN");

      // ------------------------------------------------
      // MARK ROUTE COMPLETED
      // ------------------------------------------------

      await client.query(
        `
        UPDATE route_runs
        SET
          status='completed'
        WHERE id=$1
        `,
        [route.id]
      );

      // ------------------------------------------------
      // DELETE TODAY'S STUDENT STATUS
      // ------------------------------------------------

      await client.query(
        `
        DELETE FROM daily_status
        WHERE status_date=CURRENT_DATE
          AND student_id IN (
            SELECT id
            FROM students
            WHERE bus_id=$1
          )
        `,
        [driver.bus_id]
      );

      // ------------------------------------------------
      // DELETE TODAY'S STOP DETAILS
      // ------------------------------------------------

      await client.query(
        `
        DELETE FROM stop_runs
        WHERE driver_id=$1
          AND run_date=CURRENT_DATE
        `,
        [driver.id]
      );

      // ------------------------------------------------
      // FINISH TRANSACTION
      // ------------------------------------------------

      await client.query("COMMIT");

      client.release();

      res.json({
        message:
          "Today's route is completed. Student status details have been cleared.",
      });
    } catch (e) {
      await client.query("ROLLBACK");

      client.release();

      console.error(
        "DRIVER COMPLETE ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// ==================================================
// ADMIN
// ==================================================

app.get(
  "/api/admin",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      const studentsCount =
        await db.query(`
          SELECT COUNT(*)::int AS total
          FROM students s
          JOIN users u ON u.id=s.user_id
          WHERE u.active=TRUE
        `);

      const stopsCount =
        await db.query(`
          SELECT COUNT(*)::int AS total
          FROM bus_stops
          WHERE active=TRUE
        `);

      const going =
        await db.query(`
          SELECT COUNT(*)::int AS total
          FROM daily_status
          WHERE status_date=CURRENT_DATE
            AND travel_status='going'
        `);

      const atstop =
        await db.query(`
          SELECT COUNT(*)::int AS total
          FROM daily_status
          WHERE status_date=CURRENT_DATE
            AND stop_status='at_stop'
        `);

      const { rows: students } =
        await db.query(`
          SELECT
            u.id AS user_id,
            u.user_code,
            u.name,
            bs.id AS stop_id,
            bs.stop_name,

            COALESCE(
              ds.travel_status,
              'not_confirmed'
            ) AS travel_status,

            COALESCE(
              ds.stop_status,
              'not_marked'
            ) AS stop_status

          FROM students s

          JOIN users u
            ON u.id=s.user_id

          JOIN bus_stops bs
            ON bs.id=s.stop_id

          LEFT JOIN daily_status ds
            ON ds.student_id=s.id
            AND ds.status_date=CURRENT_DATE

          WHERE u.active=TRUE

          ORDER BY
            bs.stop_order,
            u.name
        `);

      const { rows: stops } =
        await db.query(`
          SELECT
            id,
            stop_order,
            stop_name,
            expected_time,
            active
          FROM bus_stops
          ORDER BY stop_order
        `);

      res.json({
        totals: {
          students:
            studentsCount.rows[0].total,

          stops:
            stopsCount.rows[0].total,

          going:
            going.rows[0].total,

          atstop:
            atstop.rows[0].total,
        },

        students,
        stops,
      });
    } catch (e) {
      console.error(
        "ADMIN ERROR:",
        e
      );

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN ADD STUDENT
// --------------------------------------------------

app.post(
  "/api/admin/students",
  auth,
  role("admin"),
  async (req, res) => {
    const {
      name,
      userCode,
      password,
      stopId,
    } = req.body;

    if (
      !name ||
      !userCode ||
      !password ||
      !stopId
    ) {
      return res.status(400).json({
        message:
          "All fields are required.",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const u =
        await client.query(
          `
          INSERT INTO users(
            user_code,
            name,
            password_hash,
            role
          )
          VALUES(
            $1,
            $2,
            $3,
            'student'
          )
          RETURNING id
          `,
          [
            userCode.trim(),
            name.trim(),
            await bcrypt.hash(
              password,
              12
            ),
          ]
        );

      await client.query(
        `
        INSERT INTO students(
          user_id,
          bus_id,
          stop_id
        )
        VALUES(
          $1,
          $2,
          $3
        )
        `,
        [
          u.rows[0].id,
          1,
          stopId,
        ]
      );

      await client.query("COMMIT");

      res.json({
        message: "Student added.",
      });
    } catch (e) {
      await client.query("ROLLBACK");

      res.status(400).json({
        message:
          e.code === "23505"
            ? "Login ID already exists."
            : e.message,
      });
    } finally {
      client.release();
    }
  }
);

// --------------------------------------------------
// ADMIN DELETE STUDENT
// --------------------------------------------------

app.delete(
  "/api/admin/students/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      await db.query(
        `
        UPDATE users
        SET active=FALSE
        WHERE id=$1
          AND role='student'
        `,
        [req.params.id]
      );

      res.json({
        message:
          "Student deactivated.",
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN ADD STOP
// --------------------------------------------------

app.post(
  "/api/admin/stops",
  auth,
  role("admin"),
  async (req, res) => {
    const {
      name,
      order,
      expectedTime,
    } = req.body;

    if (
      !name ||
      !order ||
      !expectedTime
    ) {
      return res.status(400).json({
        message:
          "All fields are required.",
      });
    }

    try {
      await db.query(
        `
        INSERT INTO bus_stops(
          route_id,
          stop_order,
          stop_name,
          expected_time
        )
        VALUES(
          1,
          $1,
          $2,
          $3
        )
        `,
        [
          order,
          name,
          expectedTime,
        ]
      );

      res.json({
        message: "Stop added.",
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// --------------------------------------------------
// ADMIN DELETE STOP
// --------------------------------------------------

app.delete(
  "/api/admin/stops/:id",
  auth,
  role("admin"),
  async (req, res) => {
    try {
      await db.query(
        `
        UPDATE bus_stops
        SET active=FALSE
        WHERE id=$1
        `,
        [req.params.id]
      );

      res.json({
        message:
          "Stop deactivated.",
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        message: "Server error.",
      });
    }
  }
);

// ==================================================
// STATIC FILES
// ==================================================

app.use(
  express.static(
    path.join(__dirname, "../public")
  )
);

app.get("*", (req, res) =>
  res.sendFile(
    path.join(
      __dirname,
      "../public/index.html"
    )
  )
);

// ==================================================
// SERVER
// ==================================================

const port = Number(
  process.env.PORT || 3000
);

app.listen(
  port,
  "0.0.0.0",
  () =>
    console.log(
      `College Bus Connect running on ${port}`
    )
);