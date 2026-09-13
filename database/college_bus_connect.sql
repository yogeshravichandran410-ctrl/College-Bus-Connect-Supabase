CREATE DATABASE IF NOT EXISTS college_bus_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE college_bus_connect;
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS stop_runs,route_runs,daily_status,students,drivers,bus_stops,buses,routes,users;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_code VARCHAR(50) UNIQUE NOT NULL,
 name VARCHAR(120) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('student','driver','admin') NOT NULL,
 active TINYINT(1) DEFAULT 1
);
CREATE TABLE routes(id INT AUTO_INCREMENT PRIMARY KEY,route_name VARCHAR(120) UNIQUE NOT NULL);
CREATE TABLE buses(id INT AUTO_INCREMENT PRIMARY KEY,bus_number VARCHAR(50) UNIQUE NOT NULL,route_id INT NOT NULL,active TINYINT(1) DEFAULT 1,FOREIGN KEY(route_id) REFERENCES routes(id));
CREATE TABLE bus_stops(id INT AUTO_INCREMENT PRIMARY KEY,route_id INT NOT NULL,stop_order INT NOT NULL,stop_name VARCHAR(120) NOT NULL,expected_time TIME NOT NULL,active TINYINT(1) DEFAULT 1,FOREIGN KEY(route_id) REFERENCES routes(id));
CREATE TABLE students(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT UNIQUE NOT NULL,bus_id INT NOT NULL,stop_id INT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(bus_id) REFERENCES buses(id),FOREIGN KEY(stop_id) REFERENCES bus_stops(id));
CREATE TABLE drivers(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT UNIQUE NOT NULL,bus_id INT NOT NULL,active TINYINT(1) DEFAULT 1,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(bus_id) REFERENCES buses(id));
CREATE TABLE daily_status(
 id INT AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL,
 status_date DATE NOT NULL,
 travel_status ENUM('not_confirmed','going','not_going') DEFAULT 'not_confirmed',
 stop_status ENUM('not_marked','at_stop','coming') DEFAULT 'not_marked',
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE(student_id,status_date),
 FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE route_runs(id INT AUTO_INCREMENT PRIMARY KEY,driver_id INT NOT NULL,run_date DATE NOT NULL,status ENUM('started','completed','cancelled') DEFAULT 'started',started_at DATETIME,UNIQUE(driver_id,run_date),FOREIGN KEY(driver_id) REFERENCES drivers(id));
CREATE TABLE stop_runs(id INT AUTO_INCREMENT PRIMARY KEY,driver_id INT NOT NULL,stop_id INT NOT NULL,run_date DATE NOT NULL,status ENUM('completed') DEFAULT 'completed',completed_at DATETIME,UNIQUE(driver_id,stop_id,run_date),FOREIGN KEY(driver_id) REFERENCES drivers(id),FOREIGN KEY(stop_id) REFERENCES bus_stops(id));

INSERT INTO routes(route_name) VALUES('Bus 163 Route');
INSERT INTO buses(bus_number,route_id) VALUES('163',1);
INSERT INTO bus_stops(route_id,stop_order,stop_name,expected_time) VALUES
(1,1,'High School','08:00:00'),
(1,2,'CSI Church','08:10:00'),
(1,3,'PCB','08:20:00'),
(1,4,'Palayakottai Road','08:30:00'),
(1,5,'Vaikalmedu','08:40:00'),
(1,6,'Nathakadaiyur','08:50:00'),
(1,7,'Komarapalayam','09:00:00');

-- Demo password for seeded users: 1234. Change before public launch.
INSERT INTO users(user_code,name,password_hash,role) VALUES
('YOGESH','Yogesh','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','admin'),
('TAMIL','Tamil','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','driver');

INSERT INTO drivers(user_id,bus_id) SELECT id,1 FROM users WHERE user_code='TAMIL';

INSERT INTO users(user_code,name,password_hash,role) VALUES
('STU001','Yogesh','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU002','Praveen','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU003','Manikandan','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU004','Kalai','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU005','Sathish','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU006','Bhawan','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU007','Sibi','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU008','Abi','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU009','Santhosh','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU010','Aathi','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU011','Sudhan','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU012','Girl','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU013','Harish','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student'),
('STU014','Maha','$2b$12$LQv3c1yqBW1A1gYpVx7ZNeQ3b5e5sYkqHq4ZJtL0c3Jv9r2w5n7mK','student');

INSERT INTO students(user_id,bus_id,stop_id)
SELECT u.id,1,bs.id FROM users u JOIN bus_stops bs ON
(u.user_code IN ('STU001','STU002','STU003','STU004') AND bs.stop_order=1) OR
(u.user_code IN ('STU005','STU006','STU007','STU008','STU009','STU010') AND bs.stop_order=3) OR
(u.user_code='STU011' AND bs.stop_order=4) OR
(u.user_code='STU012' AND bs.stop_order=5) OR
(u.user_code IN ('STU013','STU014') AND bs.stop_order=6)
WHERE u.role='student';
