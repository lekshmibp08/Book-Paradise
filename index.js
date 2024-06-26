const express = require("express");
const app = express()
const path = require("path");
const dotenv = require("dotenv").config()
const bodyParser = require("body-parser");
const session = require("express-session")
const nocache = require("nocache")


const dbConnect = require("./config/dbConnect");
const { notFound, errorHandler } = require("./middlewares/errorHandler");



const PORT = process.env.PORT || 8000;
dbConnect();

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(nocache());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE, 10),
        httpOnly: true
    }
}))

app.set("view engine", "ejs")

// Set the views directory for both user and admin views
app.set("views", [
    path.join(__dirname, "views/user"), 
    path.join(__dirname, "views/admin")
]);


app.use(express.static(path.join(__dirname, "public")))


//For User Routes
const userRoutes = require("./routes/UserRouter")
app.use("/", userRoutes)

//For Admin Routes
const adminRoutes = require("./routes/adminRouter")
app.use("/admin", adminRoutes)

app.get('*', function (req, res) {
    res.redirect("/pageNotFound");
});


//Error Middlewares
app.use(notFound);
app.use(errorHandler);


app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
})


