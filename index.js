require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
app.use(express.json());

app.use(
  cors({ origin: ["https://cars-dealer-zeta.vercel.app", "http://localhost:5173"] })
);



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // Create a database and collection
    const database = client.db("CarDealership");

    const usersCollection = database.collection("users");
    const cartsCollection = database.collection("wishlist");
    const productsCollection = database.collection("products");

    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    // Verify Token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err || !decoded) {
          return res.status(401).send({ message: "Token expired or unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };


    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // User related endpoints
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post("/createUser", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      // Find the user by ID and update their role
      const query = { _id: new ObjectId(id) };
      const update = { $set: { role: role } };
      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });

    app.put("/users/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const update = { $set: req.body };
      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Products related endpoints
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find({}).toArray();
      res.send(result);
    });

    // Cart related endpoints
    app.get("/carts/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cartsCollection.findOne(query);
      res.send(result);
    });

    app.post("/createCart", verifyToken, async (req, res) => {
      const cart = req.body;
      const { productId, email } = cart;
      const query = { productId, email };
      const existingCart = await cartsCollection.findOne(query);
  
      if (existingCart) {
          return res.send({ message: "Cart item already exists", insertedId: null });
      }
  
      // Insert new cart item
      const result = await cartsCollection.insertOne(cart);
      res.send(result);
  });




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World! This is a template for a Node.js server.");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});