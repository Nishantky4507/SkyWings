SKYWINGS AIRLINES — COMPLETE C++ / SQLITE PROJECT
=================================================

PROJECT STRUCTURE
-----------------
SkyWings_Complete_CPP_Project/
|-- frontend/
|   |-- index.html
|   |-- flights.html
|   |-- seats.html
|   |-- passenger.html
|   |-- bookings.html
|   |-- confirmation.html
|   |-- boarding-pass.html
|   |-- css/
|   |-- js/
|   `-- assets/
|-- backend/
|   |-- backend.cpp
|   |-- httplib.h
|   |-- json.hpp
|   `-- README.txt
|-- database/
|   |-- schema.sql
|   `-- skywings.db
|-- RUN_SKYWINGS.bat
`-- README.txt

RUN ON WINDOWS
--------------
1. Extract the ZIP.
2. Install MinGW-w64 g++ and the SQLite development files for that compiler.
3. Run RUN_SKYWINGS.bat from the project root. Keep its window open.
4. Open http://localhost:8080/api/health to check the backend.
5. Open frontend/index.html using VS Code Live Server (or another static
   web server). Keep both servers running.

The batch file compiles backend/backend.cpp when backend/backend.exe is absent.
The backend expects to be launched with the project root as its working
directory; the supplied batch file does this.

DEMONSTRATION NOTICE
--------------------
Flight schedules, fares and availability are fictional demonstration data.
This project does not connect to live airline inventory or process payments.
Confirmed bookings and seat inventory are stored in SQLite.
