const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


const corsOptions = {

    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    console.log(authorization)
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized1 access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.DB_JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized2 access' })
        }
        req.decoded = decoded;
        next();
    })
}





// const uri = "mongodb+srv://<username>:<password>@cluster0.whedaw2.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.whedaw2.mongodb.net/?retryWrites=true&w=majority`;


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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db('courseDB').collection("user");
        const classCollection = client.db('courseDB').collection("class");
        const cartCollection = client.db('courseDB').collection("cart");



        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.DB_JWT_ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token });
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })


        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            // console.log("user email", email);
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })


        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            console.log('instructor email', email);
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }

            res.send(result);
        })


        // app.get('/users/home/:role', async (req, res) => {
        //     const role = req.params.role;
        //     console.log(role)
        //     const query = { role: role =='instructor' };
        //     const result = await userCollection.find(query).toArray();
        //     res.send(result);
        // })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }
            const existingUser = await userCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'User already exists' })
            };
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "admin",

                }
            };
            const results = await userCollection.updateOne(filter, updateDoc);
            res.send(results);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "instructor",
                }
            };
            const results = await userCollection.updateOne(filter, updateDoc);
            res.send(results);
        })

        // app.delete('/users/:id', async (req, res) => {
        //     const id = req.params.id;
        //     console.log(id)
        //     const query = { _id: new ObjectId(id) }
        //     const result = await cartCollection.deleteOne(query);
        //     console.log(result)
        //     res.send(result);
        // })



        // class api


        app.get('/classes/home', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.find(newClass).toArray()
            res.send(result);
        })

        // app.get('/classes/mangeClass', async (req, res) => {
        //     const result = await classCollection.find().toArray()
        //     res.send(result);
        // })




        app.get('/classes', verifyJWT, async (req, res) => {
            const email = req.query.email
            try {

                const decodedEmail = req.decoded.email;
                if (email !== decodedEmail) {
                    return res.status(403).send({ error: true, message: 'forbidden access' })
                }

                let result;
                if (email) {
                    const query = { email: email };
                    result = await classCollection.find(query).toArray();
                }

                return res.send(result);
            } catch (error) {
                console.error("Error retrieving classes:", error);
                return res.status(500).send({ message: "Failed to retrieve classes" });
            }



        })

        app.put('/classes/approved/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await classCollection.updateOne(query, updateDocument)
            res.send(result)
        })
        app.put('/classes/deny/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const updateDocument = {
                $set: {
                    status: 'deny'
                }
            }
            const result = await classCollection.updateOne(query, updateDocument)
            res.send(result)
        })

        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass)
            res.send(result);
        })




        // cart api

        // app.get('/carts', async (req, res) => {
        //     const email = req.query.email;

        //     const query = { email: email };
        //     const result = await cartCollection.find(query).toArray();
        //     console.log(result)
        //     res.send(result);
        // })

        app.get('/carts', async (req, res) => {
            const email = req.query.email
           const query= {email: email}
           const result = await cartCollection.find(query).toArray();
           res.send(result);

        })


        app.post('/carts', async (req, res) => {
            const cart = req.body;

            const result = await cartCollection.insertOne(cart);
            res.send(result);

        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

app.get(instructor)



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('assignment 12 server is running')
})


app.listen(port, (req, res) => {
    console.log(`assignment 12 server is listening on ${port}`)
})