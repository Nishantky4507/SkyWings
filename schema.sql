PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS flights (
flight_id TEXT PRIMARY KEY,
flight_number TEXT NOT NULL,
flight_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flight_seats (
id INTEGER PRIMARY KEY AUTOINCREMENT,
flight_id TEXT NOT NULL,
seat_number TEXT NOT NULL,
seat_class TEXT NOT NULL CHECK (seat_class IN ('Business Class', 'Economy')),
is_booked INTEGER NOT NULL DEFAULT 0 CHECK (is_booked IN (0, 1)),
FOREIGN KEY (flight_id) REFERENCES flights(flight_id),
UNIQUE (flight_id, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
pnr TEXT NOT NULL UNIQUE,
flight_id TEXT NOT NULL,
travel_date TEXT NOT NULL,
travel_class TEXT NOT NULL CHECK (travel_class IN ('Business Class', 'Economy')),
base_fare REAL NOT NULL,
tax REAL NOT NULL,
total_fare REAL NOT NULL,
status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Cancelled')),
flight_json TEXT NOT NULL,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);

CREATE TABLE IF NOT EXISTS passengers (
id INTEGER PRIMARY KEY AUTOINCREMENT,
booking_id INTEGER NOT NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
date_of_birth TEXT NOT NULL,
gender TEXT NOT NULL CHECK (gender IN ('Female', 'Male', 'Other')),
phone TEXT NOT NULL,
email TEXT NOT NULL,
seat_number TEXT NOT NULL,
e_ticket_number TEXT NOT NULL UNIQUE,
seat_preference TEXT NOT NULL DEFAULT 'any' CHECK (seat_preference IN ('any', 'window', 'aisle', 'middle')),
FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
UNIQUE (booking_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seats_flight_class ON flight_seats(flight_id, seat_class, is_booked);
CREATE INDEX IF NOT EXISTS idx_bookings_pnr ON bookings(pnr);
CREATE INDEX IF NOT EXISTS idx_passengers_booking ON passengers(booking_id);
