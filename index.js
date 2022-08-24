// Imports
require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
const morgan = require('morgan')
const User = require('./models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { tokenExtractor } = require('./middlewares/tokenExtractor')

app.use(express.json())
app.use(cors())
app.use(morgan("tiny"))

//MongoDB connect
console.log("Connecting to mongoDB...")
const url = process.env.MONGODB_URI

mongoose.connect(url).then(() => {
  console.log("Successfully connected to MongoDB")
}).catch(err => {
  console.log("Failed to connect to mongoDB:", err)
})

app.use(tokenExtractor)

// Routes
app.get('/', (req, res) => {
  res.send(`<h1>App root</h1>`)
})

app.post('/register', (req, res) => {
  let name = req.body.name
  let email = req.body.email
  let password = req.body.password

  User.findOne({ email: email }).then(user => {
    if(user){
      return res.status(400).json({
        success: false,
        message: "There is a User registered with this email already"
      })
    }

    const newUser = new User({
      name,
      email,
      password,
    })

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(newUser.password, salt, (err, hash) => {
        if (err) throw err
        newUser.password = hash
        newUser.save().then(() => {
          res.status(200).json({
            success: true,
            message: "Successfully registered User"
          })
        }).catch(() => {
          res.status(400).json({
            success: false,
            message: "Failed to register User"
          })
        })
      })
    })
  })
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  const passwordIsCorrect = user ? await bcrypt.compare(password, user.password) : false

  if(!(user && passwordIsCorrect)){
    return res.status(401).json({
      success: false,
      message: "email or password is incorrect"
    })
  }
  const userForToken = {
    email: user.email,
    id: user._id,
  }
  const token = jwt.sign(
    userForToken,
    process.env.SECRET,
    { expiresIn: 60 * 60 }
  )
  res.status(200).send({
    token,
    email: user.email,
    name: user.name,
  })
})

app.get('/resource', (req, res) => {
  const resourcce = {
    account: "1234567890",
    balance: "$30,0000",
  }
  if(!req.token) {
    return res.status(401).json({
      error: "Unauthorised! Token is missing"
    })
  }
  const decodedToken = jwt.verify(req.token, process.env.SECRET, (err, result) => {
    if(err) return null
    return result
  })
  if(!decodedToken){
    // token present but invalid
    return response.status(401).json({
      error: 'token missing or invalid'
    })
  }
  res.status(200).json(resourcce)
})

// Server setup
const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running at PORT ${PORT}`)
})