const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Library Management (CRUD And JWT) SERVER is running!");
});

app.listen(port, () => {
  console.log(`SERVER running on port: ${port}`);
});

// JSON WEB TOKEN
const jwt = require("jsonwebtoken");

// Cookie Parser
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// CUSTOM MIDDLEWARE

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.accessToken;
//   console.log("Token In Verify Middleware: ", token);
//   if (!token) {
//     return res.status(401).send({ message: "Not Authorized!" });
//   }
//   // JWT BuiltIn To Verify Token
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     // ERROR
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "Unauthorized Access!" });
//     }
//     // Decoded if Token is Valid
//     console.log(" Decoded Valid Token: ", decoded);
//     req.user = decoded;
//     next();
//   });
// };

// MIDDLEWARE
//To Send Token From Server Cross Origin Setup In Cors Middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      "https://library-management-crud-jwt.web.app",
      "https://library-management-crud-jwt.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Starts Here

require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// console.log(process.env.DB_USER, process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m38robg.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Creating token (auth related api) in backend
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   // res.send(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   // res.send(token);

    //   //  Set cookies with http only
    //   res
    //     .cookie("accessToken", token, {
    //       httpOnly: true,
    //       secure: false,
    //       // sameSite: "none",
    //     })
    //     .send({ success: true });
    // });

    //CLEAR COOKIES AFTER LOGGED OUT A USER
    // app.post("/logout", async (req, res) => {
    //   const user = req.body;
    //   console.log("Logging Out: ", user);
    //   res.clearCookie("accessToken", { maxAge: 0 }).send({ success: true });
    // });

    // BOOK CATEGORIES API
    const bookCategoriesCollection = client
      .db("bookByteLibraryDB")
      .collection("bookCategories");

    app.get("/bookCategories", async (req, res) => {
      const cursor = bookCategoriesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // BOOKS API TO LOAD ALL BOOKS
    const bookCollection = client
      .db("bookByteLibraryDB")
      .collection("allBooks");
    // app.get("/allBooks", async (req, res) => {
    //   const cursor = bookCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // ALL BOOKS API FOR PAGINATION
    app.get("/allBooks", async (req, res) => {
      const books = req.query;
      const page = parseInt(books.page);
      const size = parseInt(books.size);

      const cursor = bookCollection
        .find()
        .skip(page * size)
        .limit(size);
      const result = await cursor.toArray();
      res.send(result);
    });

    // TOTAL BOOKS COUNT
    app.get("/booksCount", async (req, res) => {
      const count = await bookCollection.estimatedDocumentCount();
      console.log("Total Books= ", count);
      res.send({ count });
    });

    // API TO ADD A NEW BOOK
    // JWT FOR ADD BOOK
    app.post("/allBooks", async (req, res) => {
      // console.log(req.query.email);
      // console.log("Token From Client Side:", req.cookies.accessToken);
      // console.log("USER In The Valid Token: ", req.user);

      // if (req.query.email !== req.user.email) {
      //   return res.status(403).send({ message: "Forbidden!" });
      // }

      const newBook = req.body;
      console.log(newBook);
      const result = await bookCollection.insertOne(newBook);
      res.send(result);
    });

    // API TO UPDATE A PRODUCT

    app.get("/allBooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    app.put("/allBooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBook = req.body;
      const book = {
        $set: {
          image: updatedBook.image,
          name: updatedBook.name,
          category: updatedBook.category,
          author: updatedBook.author,
          quantity: updatedBook.quantity,
          description: updatedBook.description,
          ratings: updatedBook.ratings,
        },
      };

      const result = await bookCollection.updateOne(filter, book, options);
      res.send(result);
    });

    // To Update Quantity
    app.patch("/allBooks/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedQuantity = req.body;
      console.log(updatedQuantity);
      const updateDoc = {
        $set: {
          quantity: updatedQuantity.quantity,
        },
      };
      const result = await bookCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // BORROWED BOOKS IN DB
    const borrowedBooksCollection = client
      .db("bookByteLibraryDB")
      .collection("borrowedBooks");

    // app.get("/borrowedBooks", async (req, res) => {
    //   const cursor = borrowedBooksCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // GET SOME DATA (CONDITIONAL) USING QUERY
    app.get("/borrowedBooks", async (req, res) => {
      let query = {};

      if (req.query?.email) {
        query = { userEmail: req.query.email };
      }
      const result = await borrowedBooksCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/borrowedBooks", async (req, res) => {
      const borrowedBook = req.body;
      console.log(borrowedBook);
      const result = await borrowedBooksCollection.insertOne(borrowedBook);
      res.send(result);
    });

    // DELETE METHOD TO HANDLE RETURN A BOOK
    app.delete("/borrowedBooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await borrowedBooksCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
