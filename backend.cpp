#include <iostream>
#include <string>
#include <vector>
#include <random>
#include <ctime>
#include <sqlite3.h>
#include "httplib.h"
#include "json.hpp"

using namespace std;
using json = nlohmann::json;

sqlite3* database = nullptr;
mt19937 generator(static_cast<unsigned int>(time(nullptr)));

string randomText(int length, const string& characters)
{
uniform_int_distribution<int> choose(0, static_cast<int>(characters.size()) - 1);
string result;
for(int i = 0; i < length; i++)
{
result += characters[choose(generator)];
}
return result;
}

string makePNR()
{
return randomText(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
}

string makeTicketNumber()
{
return randomText(13, "0123456789");
}

bool executeSQL(const string& sql)
{
char* error = nullptr;
int result = sqlite3_exec(database, sql.c_str(), nullptr, nullptr, &error);
if(result != SQLITE_OK)
{
cerr << "Database error: " << (error ? error : "Unknown error") << endl;
sqlite3_free(error);
return false;
}
return true;
}

bool prepare(const string& sql, sqlite3_stmt*& statement)
{
int result = sqlite3_prepare_v2(database, sql.c_str(), -1, &statement, nullptr);
if(result != SQLITE_OK)
{
cerr << "SQL prepare error: " << sqlite3_errmsg(database) << endl;
return false;
}
return true;
}

void bindText(sqlite3_stmt* statement, int position, const string& value)
{
sqlite3_bind_text(statement, position, value.c_str(), -1, SQLITE_TRANSIENT);
}

string columnText(sqlite3_stmt* statement, int column)
{
const unsigned char* value = sqlite3_column_text(statement, column);
return value ? reinterpret_cast<const char*>(value) : "";
}

json errorJSON(const string& message)
{
return json{{"success", false}, {"message", message}};
}

void sendJSON(httplib::Response& response, const json& value, int status = 200)
{
response.status = status;
response.set_content(value.dump(2), "application/json");
response.set_header("Access-Control-Allow-Origin", "*");
response.set_header("Access-Control-Allow-Headers", "Content-Type");
response.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

bool openDatabase()
{
if(sqlite3_open("database/skywings.db", &database) != SQLITE_OK)
{
cerr << "Could not open skywings.db" << endl;
return false;
}
sqlite3_busy_timeout(database, 5000);
return executeSQL("PRAGMA foreign_keys = ON;");
}

bool saveFlight(const json& flight)
{
string sql = "INSERT INTO flights (flight_id, flight_number, flight_json) VALUES (?, ?, ?) "
"ON CONFLICT(flight_id) DO UPDATE SET flight_number=excluded.flight_number, flight_json=excluded.flight_json;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return false;
bindText(statement, 1, flight.value("id", ""));
bindText(statement, 2, flight.value("number", ""));
bindText(statement, 3, flight.dump());
int result = sqlite3_step(statement);
sqlite3_finalize(statement);
return result == SQLITE_DONE;
}

bool initializeSeats(const string& flightId)
{
string countSQL = "SELECT COUNT(*) FROM flight_seats WHERE flight_id = ?;";
sqlite3_stmt* countStatement = nullptr;
if(!prepare(countSQL, countStatement)) return false;
bindText(countStatement, 1, flightId);
int count = 0;
if(sqlite3_step(countStatement) == SQLITE_ROW)
{
count = sqlite3_column_int(countStatement, 0);
}
sqlite3_finalize(countStatement);
if(count == 100) return true;

if(count != 0)
{
return false;
}

uniform_int_distribution<int> blockedChance(1, 100);
for(int number = 1; number <= 100; number++)
{
string seatNumber;
string seatClass;
if(number <= 25)
{
seatNumber = "B" + to_string(number);
seatClass = "Business Class";
}
else
{
seatNumber = "E" + to_string(number - 25);
seatClass = "Economy";
}
int occupied = blockedChance(generator) <= 7 ? 1 : 0;
string insertSQL = "INSERT INTO flight_seats (flight_id, seat_number, seat_class, is_booked) VALUES (?, ?, ?, ?);";
sqlite3_stmt* insertStatement = nullptr;
if(!prepare(insertSQL, insertStatement)) return false;
bindText(insertStatement, 1, flightId);
bindText(insertStatement, 2, seatNumber);
bindText(insertStatement, 3, seatClass);
sqlite3_bind_int(insertStatement, 4, occupied);
int result = sqlite3_step(insertStatement);
sqlite3_finalize(insertStatement);
if(result != SQLITE_DONE) return false;
}
return true;
}

json readSeatMap(const string& flightId)
{
json seats = json::array();
string sql = "SELECT seat_number, seat_class, is_booked FROM flight_seats WHERE flight_id = ? "
"ORDER BY CASE seat_class WHEN 'Business Class' THEN 0 ELSE 1 END, "
"CAST(SUBSTR(seat_number, 2) AS INTEGER);";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return seats;
bindText(statement, 1, flightId);
while(sqlite3_step(statement) == SQLITE_ROW)
{
seats.push_back({
{"seatNumber", columnText(statement, 0)},
{"seatClass", columnText(statement, 1)},
{"available", sqlite3_column_int(statement, 2) == 0}
});
}
sqlite3_finalize(statement);
return seats;
}

int countAvailable(const string& flightId, const string& seatClass)
{
string sql = "SELECT COUNT(*) FROM flight_seats WHERE flight_id = ? AND seat_class = ? AND is_booked = 0;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return 0;
bindText(statement, 1, flightId);
bindText(statement, 2, seatClass);
int count = 0;
if(sqlite3_step(statement) == SQLITE_ROW) count = sqlite3_column_int(statement, 0);
sqlite3_finalize(statement);
return count;
}

vector<string> firstAvailableSeats(const string& flightId, const string& seatClass, int passengerCount)
{
vector<string> seats;
string sql = "SELECT seat_number FROM flight_seats WHERE flight_id = ? AND seat_class = ? AND is_booked = 0 "
"ORDER BY CAST(SUBSTR(seat_number, 2) AS INTEGER) LIMIT ?;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return seats;
bindText(statement, 1, flightId);
bindText(statement, 2, seatClass);
sqlite3_bind_int(statement, 3, passengerCount);
while(sqlite3_step(statement) == SQLITE_ROW)
{
seats.push_back(columnText(statement, 0));
}
sqlite3_finalize(statement);
return seats;
}

bool occupySeats(const string& flightId, const vector<string>& seats)
{
for(const string& seat : seats)
{
string sql = "UPDATE flight_seats SET is_booked = 1 WHERE flight_id = ? AND seat_number = ? AND is_booked = 0;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return false;
bindText(statement, 1, flightId);
bindText(statement, 2, seat);
int result = sqlite3_step(statement);
sqlite3_finalize(statement);
if(result != SQLITE_DONE || sqlite3_changes(database) != 1) return false;
}
return true;
}

json getBookingJSON(int bookingId)
{
string sql = "SELECT pnr, flight_id, travel_date, travel_class, base_fare, tax, total_fare, status, flight_json "
"FROM bookings WHERE id = ?;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return nullptr;
sqlite3_bind_int(statement, 1, bookingId);
if(sqlite3_step(statement) != SQLITE_ROW)
{
sqlite3_finalize(statement);
return nullptr;
}
string pnr = columnText(statement, 0);
string flightId = columnText(statement, 1);
string travelDate = columnText(statement, 2);
string travelClass = columnText(statement, 3);
double baseFare = sqlite3_column_double(statement, 4);
double tax = sqlite3_column_double(statement, 5);
double totalFare = sqlite3_column_double(statement, 6);
string status = columnText(statement, 7);
json flight = json::parse(columnText(statement, 8), nullptr, false);
sqlite3_finalize(statement);
if(flight.is_discarded()) flight = json::object();

json passengers = json::array();
json seatNumbers = json::array();
string passengerSQL = "SELECT first_name, last_name, date_of_birth, gender, phone, email, seat_number, e_ticket_number, seat_preference "
"FROM passengers WHERE booking_id = ? ORDER BY id;";
sqlite3_stmt* passengerStatement = nullptr;
if(!prepare(passengerSQL, passengerStatement)) return nullptr;
sqlite3_bind_int(passengerStatement, 1, bookingId);
while(sqlite3_step(passengerStatement) == SQLITE_ROW)
{
json person;
person["firstName"] = columnText(passengerStatement, 0);
person["lastName"] = columnText(passengerStatement, 1);
person["name"] = person["firstName"].get<string>() + " " + person["lastName"].get<string>();
person["dateOfBirth"] = columnText(passengerStatement, 2);
person["gender"] = columnText(passengerStatement, 3);
person["phone"] = columnText(passengerStatement, 4);
person["email"] = columnText(passengerStatement, 5);
person["seatNumber"] = columnText(passengerStatement, 6);
person["eTicketNumber"] = columnText(passengerStatement, 7);
person["seatPreference"] = columnText(passengerStatement, 8);
seatNumbers.push_back(person["seatNumber"]);
passengers.push_back(person);
}
sqlite3_finalize(passengerStatement);

json booking;
booking["pnr"] = pnr;
booking["id"] = pnr;
booking["flightId"] = flightId;
booking["flight"] = flight;
booking["search"] = {{"date", travelDate}};
booking["travelClass"] = travelClass;
booking["passengers"] = passengers;
booking["seats"] = seatNumbers;
booking["baseFare"] = baseFare;
booking["tax"] = tax;
booking["total"] = totalFare;
booking["status"] = status;
booking["gateNumber"] = "A12";
return booking;
}

int findBookingId(const string& pnr)
{
string sql = "SELECT id FROM bookings WHERE pnr = ?;";
sqlite3_stmt* statement = nullptr;
if(!prepare(sql, statement)) return 0;
bindText(statement, 1, pnr);
int id = 0;
if(sqlite3_step(statement) == SQLITE_ROW) id = sqlite3_column_int(statement, 0);
sqlite3_finalize(statement);
return id;
}

int main()
{
if(!openDatabase())
{
return 1;
}

httplib::Server server;
server.Options(R"(.*)", [](const httplib::Request&, httplib::Response& response)
{
response.set_header("Access-Control-Allow-Origin", "*");
response.set_header("Access-Control-Allow-Headers", "Content-Type");
response.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
});

server.Get("/api/health", [](const httplib::Request&, httplib::Response& response)
{
sendJSON(response, {{"success", true}, {"message", "SkyWings C++ backend is running."}});
});

server.Post("/api/flights/initialize", [](const httplib::Request& request, httplib::Response& response)
{
json input = json::parse(request.body, nullptr, false);
if(input.is_discarded() || !input.contains("flight") || !input["flight"].is_object())
{
sendJSON(response, errorJSON("Flight information is missing or invalid."), 400);
return;
}
json flight = input["flight"];
string flightId = flight.value("id", "");
if(flightId.empty() || flight.value("number", "").empty())
{
sendJSON(response, errorJSON("Flight ID and flight number are required."), 400);
return;
}
if(!executeSQL("BEGIN IMMEDIATE;") || !saveFlight(flight) || !initializeSeats(flightId))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not initialize flight seats."), 500);
return;
}
executeSQL("COMMIT;");
sendJSON(response, {{"success", true}, {"flightId", flightId}, {"seats", readSeatMap(flightId)}});
});

server.Get(R"(/api/flights/([^/]+)/seats)", [](const httplib::Request& request, httplib::Response& response)
{
string flightId = request.matches[1];
sendJSON(response, {{"success", true}, {"flightId", flightId}, {"seats", readSeatMap(flightId)}});
});

server.Post("/api/bookings", [](const httplib::Request& request, httplib::Response& response)
{
json input = json::parse(request.body, nullptr, false);
if(input.is_discarded() || !input.contains("flight") || !input["flight"].is_object()
|| !input.contains("passengers") || !input["passengers"].is_array() || input["passengers"].empty())
{
sendJSON(response, errorJSON("Flight and passenger details are required."), 400);
return;
}
json flight = input["flight"];
string flightId = flight.value("id", "");
string travelDate = input.value("travelDate", "");
string travelClass = input.value("travelClass", "Economy");
int passengerCount = static_cast<int>(input["passengers"].size());
if(flightId.empty() || travelDate.empty()
|| (travelClass != "Business Class" && travelClass != "Economy"))
{
sendJSON(response, errorJSON("Flight ID, travel date or travel class is invalid."), 400);
return;
}
for(const json& person : input["passengers"])
{
if(!person.is_object() || person.value("firstName", "").empty()
|| person.value("lastName", "").empty() || person.value("dateOfBirth", "").empty()
|| person.value("gender", "").empty() || person.value("phone", "").empty()
|| person.value("email", "").empty())
{
sendJSON(response, errorJSON("Complete all required details for every passenger."), 400);
return;
}
}

if(!executeSQL("BEGIN IMMEDIATE;") || !saveFlight(flight) || !initializeSeats(flightId))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not prepare the flight inventory."), 500);
return;
}

string otherClass = travelClass == "Business Class" ? "Economy" : "Business Class";
if(countAvailable(flightId, travelClass) < passengerCount)
{
int otherAvailable = countAvailable(flightId, otherClass);
executeSQL("ROLLBACK;");
json answer = errorJSON("The selected class does not have enough available seats.");
if(otherAvailable >= passengerCount)
{
answer["needsClassSwitch"] = true;
answer["alternativeClass"] = otherClass;
answer["message"] = "The selected class is full for this group. Would you like to switch class?";
}
else
{
answer["needsClassSwitch"] = false;
answer["nextFlightInHours"] = 3;
answer["message"] = "Both sections do not have enough seats. The next flight leaves in 3 hours.";
}
sendJSON(response, answer, 409);
return;
}

vector<string> seats = firstAvailableSeats(flightId, travelClass, passengerCount);
if(static_cast<int>(seats.size()) != passengerCount || !occupySeats(flightId, seats))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Seat allocation failed. Please refresh the seat map and try again."), 409);
return;
}

double fareEach = travelClass == "Business Class" ? flight.value("firstClassFare", 0.0) : flight.value("economyFare", 0.0);
double baseFare = fareEach * passengerCount;
double tax = baseFare * 0.05;
double totalFare = baseFare + tax;
string pnr = makePNR();
string insertBooking = "INSERT INTO bookings (pnr, flight_id, travel_date, travel_class, base_fare, tax, total_fare, status, flight_json) "
"VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?);";
sqlite3_stmt* bookingStatement = nullptr;
if(!prepare(insertBooking, bookingStatement))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not save booking."), 500);
return;
}
bindText(bookingStatement, 1, pnr);
bindText(bookingStatement, 2, flightId);
bindText(bookingStatement, 3, travelDate);
bindText(bookingStatement, 4, travelClass);
sqlite3_bind_double(bookingStatement, 5, baseFare);
sqlite3_bind_double(bookingStatement, 6, tax);
sqlite3_bind_double(bookingStatement, 7, totalFare);
bindText(bookingStatement, 8, flight.dump());
int bookingResult = sqlite3_step(bookingStatement);
sqlite3_finalize(bookingStatement);
if(bookingResult != SQLITE_DONE)
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not save booking. Please try again."), 500);
return;
}
int bookingId = static_cast<int>(sqlite3_last_insert_rowid(database));

for(int i = 0; i < passengerCount; i++)
{
json person = input["passengers"][i];
string seatPreference = person.value("seatPreference", "any");
string insertPassenger = "INSERT INTO passengers "
"(booking_id, first_name, last_name, date_of_birth, gender, phone, email, seat_number, e_ticket_number, seat_preference) "
"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
sqlite3_stmt* passengerStatement = nullptr;
if(!prepare(insertPassenger, passengerStatement))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not save passenger details."), 500);
return;
}
sqlite3_bind_int(passengerStatement, 1, bookingId);
bindText(passengerStatement, 2, person.value("firstName", ""));
bindText(passengerStatement, 3, person.value("lastName", ""));
bindText(passengerStatement, 4, person.value("dateOfBirth", ""));
bindText(passengerStatement, 5, person.value("gender", ""));
bindText(passengerStatement, 6, person.value("phone", ""));
bindText(passengerStatement, 7, person.value("email", ""));
bindText(passengerStatement, 8, seats[i]);
bindText(passengerStatement, 9, makeTicketNumber());
bindText(passengerStatement, 10, seatPreference);
int passengerResult = sqlite3_step(passengerStatement);
sqlite3_finalize(passengerStatement);
if(passengerResult != SQLITE_DONE)
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not save passenger details."), 500);
return;
}
}

executeSQL("COMMIT;");
json booking = getBookingJSON(bookingId);
booking["success"] = true;
sendJSON(response, booking, 201);
});

server.Get("/api/bookings", [](const httplib::Request& request, httplib::Response& response)
{
if(request.has_param("pnr"))
{
string pnr = request.get_param_value("pnr");
int bookingId = findBookingId(pnr);
if(bookingId == 0)
{
sendJSON(response, errorJSON("Booking not found."), 404);
return;
}
sendJSON(response, {{"success", true}, {"booking", getBookingJSON(bookingId)}});
return;
}

json bookings = json::array();
sqlite3_stmt* statement = nullptr;
if(!prepare("SELECT id FROM bookings ORDER BY id DESC;", statement))
{
sendJSON(response, errorJSON("Could not read bookings."), 500);
return;
}
while(sqlite3_step(statement) == SQLITE_ROW)
{
int bookingId = sqlite3_column_int(statement, 0);
bookings.push_back(getBookingJSON(bookingId));
}
sqlite3_finalize(statement);
sendJSON(response, {{"success", true}, {"bookings", bookings}});
});

server.Post(R"(/api/bookings/([^/]+)/cancel)", [](const httplib::Request& request, httplib::Response& response)
{
string pnr = request.matches[1];
int bookingId = findBookingId(pnr);
if(bookingId == 0)
{
sendJSON(response, errorJSON("Booking not found."), 404);
return;
}
if(!executeSQL("BEGIN IMMEDIATE;"))
{
sendJSON(response, errorJSON("Could not start cancellation."), 500);
return;
}
string statusSQL = "SELECT status, flight_id FROM bookings WHERE id = ?;";
sqlite3_stmt* statusStatement = nullptr;
if(!prepare(statusSQL, statusStatement))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not read booking."), 500);
return;
}
sqlite3_bind_int(statusStatement, 1, bookingId);
if(sqlite3_step(statusStatement) != SQLITE_ROW)
{
sqlite3_finalize(statusStatement);
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Booking not found."), 404);
return;
}
string status = columnText(statusStatement, 0);
string flightId = columnText(statusStatement, 1);
sqlite3_finalize(statusStatement);
if(status == "Cancelled")
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("This booking is already cancelled."), 409);
return;
}

string releaseSQL = "UPDATE flight_seats SET is_booked = 0 WHERE flight_id = ? AND seat_number IN "
"(SELECT seat_number FROM passengers WHERE booking_id = ?);";
sqlite3_stmt* releaseStatement = nullptr;
if(!prepare(releaseSQL, releaseStatement))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not release seats."), 500);
return;
}
bindText(releaseStatement, 1, flightId);
sqlite3_bind_int(releaseStatement, 2, bookingId);
int releaseResult = sqlite3_step(releaseStatement);
sqlite3_finalize(releaseStatement);
if(releaseResult != SQLITE_DONE)
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not release seats."), 500);
return;
}

sqlite3_stmt* cancelStatement = nullptr;
if(!prepare("UPDATE bookings SET status = 'Cancelled' WHERE id = ?;", cancelStatement))
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not cancel booking."), 500);
return;
}
sqlite3_bind_int(cancelStatement, 1, bookingId);
int cancelResult = sqlite3_step(cancelStatement);
sqlite3_finalize(cancelStatement);
if(cancelResult != SQLITE_DONE)
{
executeSQL("ROLLBACK;");
sendJSON(response, errorJSON("Could not cancel booking."), 500);
return;
}
executeSQL("COMMIT;");
sendJSON(response, {{"success", true}, {"message", "Booking cancelled and seats released."}});
});

cout << "SkyWings backend running at http://localhost:8080" << endl;
cout << "Keep this terminal open while using the website." << endl;
server.listen("127.0.0.1", 8080);
sqlite3_close(database);
return 0;
}
