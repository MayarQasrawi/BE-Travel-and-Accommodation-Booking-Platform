const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
// const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;

const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hotel API",
      version: "1.0.0",
      description: "A simple Express API to manage hotels and bookings",
    },
  },
  apis: ["./server.js"], // Adjust if your routes are in a different file
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const getJsonData = (fileName) => {
  const filePath = path.join(__dirname, "data", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const deleteJsonData = (fileName, key, value) => {
  const filePath = path.join(__dirname, "data", fileName);
  if (!fs.existsSync(filePath)) {
    console.log("File not found.");
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  let data = fileContent ? JSON.parse(fileContent) : [];
  console.log(data);
  const newData = data.filter((item) => item[key] !== Number(value));
  if (newData.length === data.length) {
    console.log("No matching record found to delete.");
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), "utf8");
  console.log(`Deleted record with ${key}: ${value}`);
};

const writeJsonData = (fileName, newData, uniqueKey = "id") => {
  const filePath = path.join(__dirname, "data", fileName);
  let data = [];
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf8");
    data = fileContent ? JSON.parse(fileContent) : [];
  }
  const index = data.findIndex(
    (item) => item[uniqueKey] === newData[uniqueKey]
  );

  if (index !== -1) {
    data[index] = { ...data[index], ...newData };
  } else {
    data.push(newData);
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());


app.post("/api/auth/authenticate", (req, res) => {
  const { userName, password } = req.body;

  let payload, userType;

  if (userName === "user" && password === "user") {
    payload = { user_id: 2, given_name: "Mayar", family_name: "Qasarwa", userType: "User" };
    userType = "User";
  } else if (userName === "admin" && password === "admin") {
    payload = { user_id: 1, given_name: "Mayar", family_name: "Qasarwa", userType: "Admin" };
    userType = "Admin";
  } else {
    return res.status(401).json({ message: "Invalid user or password" });
  }

  const token = jwt.sign(payload, "your-secret", { expiresIn: "1h", issuer: "your-app" });

  res.json({ authentication: token, userType });
});

app.get("/api/home/users/2/recent-hotels", (req, res) => {
  res.json(getJsonData("recentHotels.json"));
});

app.get("/api/home/featured-deals", (req, res) => {
  res.json(getJsonData("featuredDeals.json"));
});

app.get("/api/home/destinations/trending", (req, res) => {
  res.json(getJsonData("trending.json"));
});

app.get("/api/hotels", (req, res) => {
  const hotels = getJsonData("hotels.json");
  const { searchQuery = "", pageNumber = 1, pageSize = 10} = req.query;
  let filteredHotels = hotels;
  if (searchQuery) {
    filteredHotels = filteredHotels.filter(
      (hotel) =>
        (hotel.hotelName &&
          hotel.hotelName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (hotel.name &&
          hotel.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        hotel.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + parseInt(pageSize);
  filteredHotels = filteredHotels.map((hotel) => {
    return {
      ...hotel,
      name: hotel.hotelName || hotel.name,
    };
  });
  const paginatedHotels = filteredHotels.slice(startIndex, endIndex);
  res.json(paginatedHotels);
});



app.get("/api/hotels/:id/gallery", (req, res) => {
  res.json(getJsonData("gallery.json"));
});

app.get("/api/hotels/:id", (req, res) => {
  res.json(getJsonData("hotelId.json"));
});

app.get("/api/hotels/:id/available-rooms", (req, res) => {
  res.json(getJsonData("availableRooms.json"));
});

app.get("/api/hotels/:id/reviews", (req, res) => {
  res.json(getJsonData("reviews.json"));
});

app.post("/api/bookings", (req, res) => {
    const bookings = getJsonData("bookings.json"); // array of bookings
  res.json(bookings[0]);
});

app.get("/api/bookings/:id", (req, res) => {
  const bookings = getJsonData("bookings.json"); // array of bookings

  if (bookings.length === 0) {
    return res.status(404).json({ error: "No bookings found" });
  }

  res.json(bookings[0]);
});

app.get("/api/bookings", (req, res) => {
  res.json(getJsonData("bookings.json"));
});


app.get("/api/hotels/search", async (req, res) => {
  try {
    const {
      city,
      checkInDate,
      checkOutDate,
      adults,
      children,
      numberOfRooms,
      page = "0",
      limit = "12",
     
    } = req.query;

    // Parse pagination params
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = pageNum * limitNum;

    // Get all rooms
    const rooms = getJsonData("searchResults.json");
    let filteredResults = rooms;

    // ===== FILTERING =====

    // Filter by city
    if (city) {
      filteredResults = filteredResults.filter((room) =>
        room.cityName.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Filter by adults
    if (adults) {
      const adultsNum = parseInt(adults, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfAdults >= adultsNum
      );
    }

    // Filter by children
    if (children) {
      const childrenNum = parseInt(children, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfChildren >= childrenNum
      );
    }

    // Filter by number of rooms
    if (numberOfRooms) {
      const roomsNum = parseInt(numberOfRooms, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfRooms >= roomsNum
      );
    }

    // Date filtering (if needed)
    // if (checkInDate && checkOutDate) {
    //   const userCheckIn = new Date(checkInDate);
    //   const userCheckOut = new Date(checkOutDate);
    //
    //   filteredResults = filteredResults.filter((room) => {
    //     const roomAvailableFrom = new Date(room.checkInDate);
    //     const roomAvailableTo = new Date(room.checkOutDate);
    //
    //     return (
    //       roomAvailableFrom <= userCheckIn &&
    //       roomAvailableTo >= userCheckOut
    //     );
    //   });
    // }

   

    // ===== PAGINATION =====

    const totalResults = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limitNum);
    const totalPages = Math.ceil(totalResults / limitNum);
    const hasMore = pageNum < totalPages - 1;
    const nextCursor = hasMore ? pageNum + 1 : null;

    // Return paginated response
    res.json({
      success: true,
      hotels: paginatedResults,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults,
        resultsPerPage: limitNum,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while searching for hotels",
      error: error.message,
    });
  }
});


app.get("/api/search-results/amenities", (req, res) => {
  res.json(getJsonData("amenities.json"));
});

app.get("/api/cities", (req, res) => {
  const cities = getJsonData("cities.json");
  const { searchQuery = "" } = req.query;

  const filteredCities = cities.filter(
    (city) =>
      city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  res.json(filteredCities);
});



app.get("/api/home/search", async (req, res) => {
  try {
    const {
      city,
      checkInDate,
      checkOutDate,
      adults,
      children,
      numberOfRooms,
      page = "0",
      limit = "6",
     
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = pageNum * limitNum;

    // Get all rooms
    const rooms = getJsonData("searchResults.json");
    let filteredResults = rooms;

    // ===== FILTERING =====

    // Filter by city
    if (city) {
      filteredResults = filteredResults.filter((room) =>
        room.cityName.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Filter by adults
    if (adults) {
      const adultsNum = parseInt(adults, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfAdults >= adultsNum
      );
    }

    if (children) {
      const childrenNum = parseInt(children, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfChildren >= childrenNum
      );
    }

    // Filter by number of rooms
    if (numberOfRooms) {
      const roomsNum = parseInt(numberOfRooms, 10);
      filteredResults = filteredResults.filter(
        (room) => room.numberOfRooms >= roomsNum
      );
    }

    // Date filtering (if needed)
    // if (checkInDate && checkOutDate) {
    //   const userCheckIn = new Date(checkInDate);
    //   const userCheckOut = new Date(checkOutDate);
    //
    //   filteredResults = filteredResults.filter((room) => {
    //     const roomAvailableFrom = new Date(room.checkInDate);
    //     const roomAvailableTo = new Date(room.checkOutDate);
    //
    //     return (
    //       roomAvailableFrom <= userCheckIn &&
    //       roomAvailableTo >= userCheckOut
    //     );
    //   });
    // }

   

    // ===== PAGINATION =====

    const totalResults = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limitNum);
    const totalPages = Math.ceil(totalResults / limitNum);
    const hasMore = pageNum < totalPages - 1;
    const nextCursor = hasMore ? pageNum + 1 : null;

    // Return paginated response
    res.json({
      success: true,
      hotels: paginatedResults,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults,
        resultsPerPage: limitNum,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while searching for hotels",
      error: error.message,
    });
  }
});


app.get("/api/hotels/:id/rooms", (req, res) => {
  res.json(getJsonData("rooms.json"));
});

app.put("/api/cities/:id", (req, res) => {
  const newData = {
    id: Number(req.params.id),
    ...req.body,
  };
  writeJsonData("cities.json", newData);
  res.json(getJsonData("cities.json"));
});
app.delete("/api/cities/:id", (req, res) => {
  deleteJsonData("cities.json", "id", req.params.id);
  res.json(getJsonData("cities.json"));
});
app.post("/api/cities", (req, res) => {
  const data = getJsonData("cities.json");
  writeJsonData("cities.json", {
    id: data[data.length - 1].id + 1,
    ...req.body,
  });
  res.json(getJsonData("cities.json"));
});

// Update a hotel
app.put("/api/hotels/:id", (req, res) => {
  const hotelId = Number(req.params.id);
  const hotels = getJsonData("hotels.json");

  const index = hotels.findIndex((h) => h.id === hotelId);
  if (index === -1) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  hotels[index] = { ...hotels[index], ...req.body, id: hotelId };
  fs.writeFileSync(path.join(__dirname, "data", "hotels.json"), JSON.stringify(hotels, null, 2), "utf8");

  res.json(hotels[index]);
});

// Delete a hotel
app.delete("/api/hotels/:id", (req, res) => {
  const hotelId = Number(req.params.id);
  let hotels = getJsonData("hotels.json");

  const initialLength = hotels.length;
  hotels = hotels.filter((h) => h.id !== hotelId);

  if (hotels.length === initialLength) {
    return res.status(404).json({ message: "Hotel not found" });
  }

  fs.writeFileSync(path.join(__dirname, "data", "hotels.json"), JSON.stringify(hotels, null, 2), "utf8");

  res.json({ message: `Hotel with id ${hotelId} deleted successfully`, hotels });
});

// Create a new hotel
app.post("/api/hotels", (req, res) => {
  const hotels = getJsonData("hotels.json");

  const newId = hotels.length > 0 ? Math.max(...hotels.map((h) => h.id)) + 1 : 1;
  const newHotel = { id: newId, ...req.body };

  hotels.push(newHotel);
  fs.writeFileSync(path.join(__dirname, "data", "hotels.json"), JSON.stringify(hotels, null, 2), "utf8");

  res.status(201).json(newHotel);
});

app.get("/api/rooms", (req, res) => {
  const rooms = getJsonData("rooms.json");
  const { searchQuery } = req.query;

  if (searchQuery) {
    const filteredRooms = rooms.filter((room) =>
      room.roomNumber.toString().includes(searchQuery)
    );
    return res.json(filteredRooms); 
  }

  res.json(rooms); 
});



app.put("/api/rooms/:roomId", (req, res) => {
  const roomId = Number(req.params.roomId);
  
  const updatedRoom = {
    roomId: roomId,
    ...req.body,
  };
  
  writeJsonData("rooms.json", updatedRoom, "roomId");
  res.json(getJsonData("rooms.json"));
});

app.delete("/api/rooms/:roomId", (req, res) => {
  deleteJsonData("rooms.json", "roomId", req.params.roomId); 
  res.json(getJsonData("rooms.json"));
});

app.post("/api/rooms", (req, res) => {
  const data = getJsonData("rooms.json");
  const newRoomId = data.length > 0 ? data[data.length - 1].roomId + 1 : 1; 
  writeJsonData("rooms.json", {
    roomId: newRoomId,
    ...req.body,
  });
  res.json(getJsonData("rooms.json"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

/**
 * @swagger
 * /api/auth/authenticate:
 *   post:
 *     summary: Authenticate a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful authentication
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authentication:
 *                   type: string
 *                 userType:
 *                   type: string
 *       401:
 *         description: Invalid user or password
 */

/**
 * @swagger
 * /api/home/users/{userId}/recent-hotels:
 *   get:
 *     summary: Get recent hotels for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of recent hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/home/featured-deals:
 *   get:
 *     summary: Get featured hotel deals
 *     responses:
 *       200:
 *         description: List of featured hotel deals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/home/destinations/trending:
 *   get:
 *     summary: Get trending destinations
 *     responses:
 *       200:
 *         description: List of trending destinations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/hotels:
 *   get:
 *     summary: Get a list of hotels
 *     parameters:
 *       - in: query
 *         name: searchQuery
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query for filtering hotels
 *       - in: query
 *         name: pageNumber
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of hotels per page
 *     responses:
 *       200:
 *         description: List of hotels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/hotels/{id}/gallery:
 *   get:
 *     summary: Get hotel gallery by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel gallery
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/hotels/{id}:
 *   get:
 *     summary: Get hotel details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

/**
 * @swagger
 * /api/hotels/{id}/available-rooms:
 *   get:
 *     summary: Get available rooms for a hotel by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: List of available rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/hotels/{id}/reviews:
 *   get:
 *     summary: Get hotel reviews by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: List of hotel reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotelId:
 *                 type: integer
 *               roomId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Booking confirmation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

/**
 * @swagger
 * /api/home/search:
 *   get:
 *     summary: Search for rooms
 *     parameters:
 *       - in: query
 *         name: city
 *         required: false
 *         schema:
 *           type: string
 *         description: City for search filter
 *       - in: query
 *         name: checkInDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date
 *       - in: query
 *         name: checkOutDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date
 *       - in: query
 *         name: adults
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of adults
 *       - in: query
 *         name: children
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of children
 *       - in: query
 *         name: numberOfRooms
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of rooms
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/search-results/amenities:
 *   get:
 *     summary: Get list of available amenities
 *     responses:
 *       200:
 *         description: List of amenities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Get list of cities
 *     responses:
 *       200:
 *         description: List of cities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/hotels/{id}/rooms:
 *   get:
 *     summary: Get rooms available in a hotel by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: List of rooms in a hotel
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/cities/{id}:
 *   put:
 *     summary: Update a city by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: City ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: City updated
 */

/**
 * @swagger
 * /api/cities/{id}:
 *   delete:
 *     summary: Delete a city by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: City ID
 *     responses:
 *       200:
 *         description: City deleted
 */

/**
 * @swagger
 * /api/cities:
 *   post:
 *     summary: Create a new city
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: City created
 */

/**
 * @swagger
 * /api/hotels/{id}:
 *   put:
 *     summary: Update a hotel by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Hotel updated
 */

/**
 * @swagger
 * /api/hotels/{id}:
 *   delete:
 *     summary: Delete a hotel by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel deleted
 */

/**
 * @swagger
 * /api/hotels:
 *   post:
 *     summary: Create a new hotel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Hotel created
 */

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update a room by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Room updated
 */

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete a room by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted
 */

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Room created
 */
