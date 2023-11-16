const express = require('express');
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;


//  middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.malve12.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cardsCollection = client.db("bistroDb").collection("cards");

    // Jwt middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: " unauthorize access" })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.USER_SECRET_KEY, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: " unauthorize access" })
        }
        req.decoded = decoded;
      });
      next();
    }

    // /verify  Admin access after verify token
    const verifyAdmin = async (req, res , next) => {
        const email = req.decoded.email;
        const query = {email: email}
        const user = await usersCollection.findOne(query);
        const isAdmin = user?.roll === 'admin'
        if (!isAdmin) {
          return res.status(403).send({ message: " forbidden access" })
        }
        next()
    }


    //  jwt token 
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.USER_SECRET_KEY, { expiresIn: '1h' });
      res.send({ token })
    })



    // Users data Collection

    app.get('/api/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: " forbidden access" })
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query)
      let Admin = false;
      if (user) {
        Admin = user?.roll === 'admin'
      }
      res.send({ Admin })
    })

    app.get("/api/users", verifyToken, verifyAdmin , async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post("/api/users", async (req, res) => {
      const user = req.body;
      // new id checking isAxis
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: " user already exists", insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.delete('/user/delete/:id',verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          roll: 'admin'
        }
      }
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    })




    //   menu section
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    //  cards management 
    app.get('/card', async (req, res) => {
      const email = req.query.email;
      let query = {}
      if (email) {
        query = {
          email: email
        }
      }
      const result = await cardsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/cards', async (req, res) => {
      const bodyItem = req.body;
      const result = await cardsCollection.insertOne(bodyItem)
      res.send(result);

    });

    app.delete('/cards/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await cardsCollection.deleteOne(query);
      res.send(result);
    });



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Welcome to my server')
})

app.listen(port, (req, res) => {
  console.log(`Starting port is running on ${port}`);
});