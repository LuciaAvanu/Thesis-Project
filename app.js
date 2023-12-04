if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}


const express = require('express')
const app = express()
const mongoose = require('mongoose')
const path = require('path')
const methodOverride = require('method-override')
const File = require('./models/file')
const User = require('./models/user')
const Announcement = require('./models/announcement')
const Message = require('./models/message')

const session = require('express-session')

const multer = require('multer')
const ejsMate = require('ejs-mate')
const { storage } = require('./cloudinary')
const upload = multer({ storage })
const { isLoggedIn } = require('./middleware')

//passport setup
const passport = require('passport')
const LocalStrategy = require('passport-local')
const { nextTick } = require('process')
const { UserExistsError } = require('passport-local-mongoose/lib/errors')


app.engine('ejs', ejsMate)

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))

app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));

const sessionConfig = {
    secret: 'thisisasecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

}

app.use(session(sessionConfig))





// ----------------------passport--------------------------------------

app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate())) // use the LocalStrategy and for that, the authentication is going to be located on our user model
    // the authenticate is a static method added automatically when using passport

passport.serializeUser(User.serializeUser()) //how to serialize a user - how do we store a user in the session
passport.deserializeUser(User.deserializeUser()) //how we get a user out of the session



app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.currentPath = req.originalUrl;
    next();
})



// Conectarea la baza de date
main().catch(err => console.log(err));
async function main() {
    await mongoose.connect('mongodb://localhost:27017/licenta-practice');
    console.log("DATABASE CONNECTED")
}


// ROUTES
app.get('/', (req, res) => {
    res.render('index')
})

// --------------------register-----------------------

app.get('/register', (req, res) => {
    res.render('users/register')
})

app.post('/register', async(req, res) => {
    console.log(req.body)
    const { username, email, password } = req.body
    const user = new User({ username, email })
    const registeredUser = await User.register(user, password)
    res.redirect('/login')
})

// -------------------------------login---------------------------
app.get('/login', (req, res) => {
    res.render('users/login')
})

app.post('/login', passport.authenticate('local'), async(req, res) => {
    const user = await User.findOne({ username: req.body.username })
    console.log(`Acces permis pentru utilizatorul ${user}`)
    if (user.isTutore) {
        res.redirect('incoming')
    } else {
        res.redirect('/files')
    }
})


app.get('/incoming', async(req, res) => {
    const allMessages = await Message.find({});
    const users = await User.find({});
    res.render('incoming', { allMessages, users })
})

// --------------------------logout-------------------
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/')
})


// ------------------------- FILES -------------------------------
app.get('/files', isLoggedIn, async(req, res) => {
    const queryObject = req.query;
    let author = queryObject.author;
    let year = queryObject.year;
    let disc = queryObject.disc;

    if (author == '') {
        author = undefined;
    }
    if (year == '') {
        year = undefined;
    }
    if (disc == '') {
        disc = undefined;
    }
    if (!req.user.isTutore) {
        if (author && year && disc) {
            console.log("Cautare dupa toate 3")
            const files = await File.find({ author, year, disc })
            res.render('files', { files })
        } else if (author && year) {
            console.log("Cautare dupa autor si an")
            const files = await File.find({ author, year })
            res.render('files', { files })
        } else if (author && disc) {
            console.log("Cautare dupa autor si materie")
            const files = await File.find({ author, disc })
            res.render('files', { files })
        } else if (year && disc) {
            console.log("Cautare dupa an si materie")
            const files = await File.find({ year, disc })
            res.render('files', { files })
        } else if (author) {
            console.log("Cautare dupa autor")
            const files = await File.find({ author })
            res.render('files', { files })
        } else if (year) {
            console.log("Cautare dupa an")
            const files = await File.find({ year })
            res.render('files', { files })
        } else if (disc) {
            console.log("Cautare dupa  materie")
            const files = await File.find({ disc })
            res.render('files', { files })
        } else {
            console.log("Cautare 0")
            const files = await File.find({});
            res.render('files', { files })
        }
    } else {
        res.send("Nu aveți acces la această pagină.")
    }
})



app.get('/files/:id', async(req, res) => {
    const { id } = req.params;
    const foundFile = await File.findById(id);
    res.render('show', { foundFile })
})

app.post('/files/:id', upload.single('data'), async(req, res) => {
    const id = req.params.id;
    const user = await User.findById(id);

    const { path, filename } = req.file;
    const { title, author, disc, year } = req.body;
    const newFile = new File({
        title: title,
        author: author,
        data: {
            url: path,
            filename: filename
        },
        disc: disc.toLowerCase(),
        year: year
    })
    await newFile.save();
    console.log(`Noul fisier ${newFile} a fost adaugat cu succes`)
    res.redirect(`/my-materials/${user.username}`)

})

app.get('/new', isLoggedIn, (req, res) => {
    res.render('new')
})

// -- -- -- -- -- -- -- -- -- - PREVIEW FILES-- -- -- -- -- -- -- -- -- -- -- -- -- -- -
app.get('/preview/:id', async(req, res) => {
    const id = req.params.id;
    const file = await File.findById(id);
    res.render('preview', { file });
})



// ---------------------- MATERIALE TUTORI ------------------------
app.get('/tutor-materials', async(req, res) => {
        const queryObject = req.query;
        let author = queryObject.author;
        let year = queryObject.year;
        let disc = queryObject.disc;

        if (author == '') {
            author = undefined;
        }
        if (year == '') {
            year = undefined;
        }
        if (disc == '') {
            disc = undefined;
        }

        if (author && year && disc) {
            console.log("Cautare dupa toate 3")
            const files = await File.find({ author, year, disc })
            res.render('tutor-materials', { files })
        } else if (author && year) {
            console.log("Cautare dupa autor si an")
            const files = await File.find({ author, year })
            res.render('tutor-materials', { files })
        } else if (author && disc) {
            console.log("Cautare dupa autor si materie")
            const files = await File.find({ author, disc })
            res.render('tutor-materials', { files })
        } else if (year && disc) {
            console.log("Cautare dupa an si materie")
            const files = await File.find({ year, disc })
            res.render('tutor-materials', { files })
        } else if (author) {
            console.log("Cautare dupa autor")
            const files = await File.find({ author })
            res.render('tutor-materials', { files })
        } else if (year) {
            console.log("Cautare dupa an")
            const files = await File.find({ year })
            res.render('tutor-materials', { files })
        } else if (disc) {
            console.log("Cautare dupa  materie")
            const files = await File.find({ disc })
            res.render('tutor-materials', { files })
        } else {
            console.log("Cautare 0")
            const files = await File.find({});
            res.render('tutor-materials', { files })
        }

    })
    // ---------------------- MATERIALELE MELE ------------------------
app.get('/my-materials/:author', async(req, res) => {
    const author = req.params.author;

    const queryObject = req.query;
    let year = queryObject.year;
    let disc = queryObject.disc;

    if (year == '') {
        year = undefined;
    }
    if (disc == '') {
        disc = undefined;
    }

    if (req.user.username == author) {
        if (year && disc) {
            console.log("Cautare dupa an si materie")
            const files = await File.find({ author, year, disc })
            res.render('my-materials', { files })
        } else if (year) {
            console.log("Cautare dupa an")
            const files = await File.find({ author, year })
            res.render('my-materials', { files })
        } else if (disc) {
            console.log("Cautare dupa  materie")
            const files = await File.find({ author, disc })
            res.render('my-materials', { files })
        } else {
            console.log("Cautare 0")
            const files = await File.find({ author });
            res.render('my-materials', { files })
        }
    } else {
        res.send("Nu aveți acces la această pagină.")
    }

})

app.delete('/my-materials/:username/:file_id', async(req, res) => {
    const username = req.params.username;
    const file_id = req.params.file_id;
    const fileToDelete = await File.findById(file_id)
    console.log(`Urmatorul document va fi sters din baza de date: ${fileToDelete}`)
    await File.findByIdAndDelete(file_id)
    res.redirect(`/my-materials/${username}`);
})

app.get('/my-materials/edit/:id', async(req, res) => {
    const id = req.params.id;
    const file = await File.findById(id)
    res.render('file-edit', { file })
})

app.put('/my-materials/:username/edit/:id', async(req, res) => {
    const id = req.params.id;
    const username = req.params.username;
    const { title, author, disc, year } = req.body;
    await File.findByIdAndUpdate(id, { title, author, disc, year })
    res.redirect(`/my-materials/${username}`)
})

// ------------------------- ANNOUNCEMENTS -------------------------------
app.get('/announcements', async(req, res) => {
    const users = await User.find({ isTutore: true });
    const announcements = await Announcement.find({});
    res.render('announcements', { announcements, users });
})

app.post('/users/:id/announcements', async(req, res) => {
    const id = req.params.id;
    const user = await User.findById(id);
    const title = req.body.title;
    const text = req.body.text;


    let today = new Date(); //luam data calendaristica completa
    let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    let time = today.getHours() + ":" + today.getMinutes();

    const announcement = new Announcement({
        text: text,
        title: title,
        author: user,
        postedAt: {
            date: date,
            time: time
        }
    });


    Announcement.findOne({ text: text })
        .populate('author')

    await announcement.save();
    console.log(announcement)
    res.redirect('/announcements')
})

app.get('/announcements/:id/edit', async(req, res) => {
    if (req.user.isTutore) {
        const id = req.params.id;
        const announcement = await Announcement.findById(id);
        res.render('announcement-edit', { announcement })
    } else {
        res.send("Aveți nevoie de un cont de tutore pentru a face modificări.")
    }
})

app.put('/announcements/:id', async(req, res) => {
    const id = req.params.id;
    const updatedTitle = req.body.title;
    const updatedText = req.body.text;
    await Announcement.findByIdAndUpdate(id, { title: updatedTitle, text: updatedText })
    res.redirect('/announcements')
})

app.delete('/announcements/:id', async(req, res) => {
    if (req.user.isTutore) {
        const id = req.params.id;
        const announcementToDelete = await Announcement.findById(id);
        console.log(announcementToDelete)
        await Announcement.findByIdAndDelete(id);
        res.redirect('/announcements');
    } else {
        res.send("Aveți nevoie de un cont de tutore pentru a face modificări.")
    }
})

app.put('/announcements/:id/archive', async(req, res) => {
    if (req.user.isTutore) {
        const id = req.params.id;
        await Announcement.findByIdAndUpdate(id, { isArchived: true });
        res.redirect('/announcements')
    } else {
        res.send("Aveți nevoie de un cont de tutore pentru a face modificări.")
    }
})

app.get('/archive', async(req, res) => {
    const users = await User.find({});
    const announcements = await Announcement.find({ isArchived: true });
    if (req.user.isTutore) {
        res.render('archive', { announcements, users })
    } else {
        res.send("Nu aveți acces la această pagină.")
    }
})

app.get('/announcements/view/:id', async(req, res) => {
    const id = req.params.id;
    const users = await User.find({});
    const announcement = await Announcement.findById(id);
    res.render('announcement-view', { announcement, users })
})


// ------------------------------ CHAT ------------------------------------
app.get('/chat', async(req, res) => {
    const users = await User.find({ isTutore: true });
    res.render('chat', { users })
})

app.get('/chat/:id_receiver', async(req, res) => { //id-ul de aici este id-ul celui care primeste mesajul
    const messages = await Message.find({});
    const users = await User.find({});

    const id_receiver = req.params.id_receiver;
    const receiver = await User.findById(id_receiver)

    res.render('conversation', { receiver, messages, users })

})

app.post('/chat/:id_receiver/send/:id_sender', async(req, res) => {
    //cautam tutorele
    const id_receiver = req.params.id_receiver;
    const receiver = await User.findById(id_receiver)

    //cautam utilizatorul curent 
    const id_sender = req.params.id_sender;
    const sender = await User.findById(id_sender);


    let today = new Date(); //luam data calendaristica completa
    let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    let time = today.getHours() + ":" + today.getMinutes();

    //setam text-ul mesajului

    const { text } = req.body;
    const message = new Message({
        text: text,
        sentAt: {
            date: date,
            time: time
        },
        sender: sender,
        receiver: receiver
    })

    await message.save();
    console.log(message);
    res.redirect(`/chat/${receiver._id}`)
})



// server 
app.listen(3010, () => {
    console.log("LISTENING ON PORT 3010")
})