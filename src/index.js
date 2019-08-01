var express = require('express')
const mongoose = require('mongoose')
const multer = require('multer')
const sharp = require('sharp')
const bcrypt = require('bcrypt')
const cors = require('cors')

const User = require('./models/user')
const Task = require('./models/task')
 
mongoose.connect('mongodb+srv://ahmadsubhan24:purwadhika21!@@clusterchan-apnmr.mongodb.net/jc9mongo?retryWrites=true&w=majority', {
    // Parser string URL
    useNewUrlParser: true,

    // ensureIndex(), usang
    // createIndex(), baru
    useCreateIndex: true
})

const app = express()
const port = 2019

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("<h1>API Berhasil di jalankan</h1>")
})


// YANG INI
// CREAT ONE USER
app.post('/users/input', async (req, res) => {
    const {name, email, age, password} = req.body

    const data_name = name
    const data_email = email
    const data_password = password
    const data_age = age

    // Create new object user
    // _id, name, email, pass, age
    const person = new User({
        name: data_name,
        email: data_email,
        password: data_password, // satuduatiga
        age: data_age
    })

    // ES7
    try {
        var result = await person.save()
        res.send(result)
    } catch (err) {
        res.send(err.message)
    }

    // ES6
    // person.save()
    // .then(result => {
    //     res.send(result)
    // }).catch(err => {
    //     res.send(err.message)
    // })
    

})

// Konfigurasi multer a.k.a upload gambar
const upload = multer({
    limits: {
        fileSize: 3000000 // Byte
    },
    fileFilter(req, file, cb){
        var boleh = file.originalname.match(/\.(jpg|jpeg|png)$/)

        if(!boleh){ // jika tidak match
            cb(new Error('Please upload file dengan ext .jpg.png.jpeg'))
        }

        // file di terima
        cb(undefined, true)
    }
})

// CREATE AVATAR
app.post('/users/:id/avatar', upload.single('ravatar'),(req, res) => {
    const data_id = req.params.id
    
    // Resize ukuran dan ubah ext png
    sharp(req.file.buffer).resize({width: 250}).png().toBuffer()
    .then(buffer => {
        // hasil resize ada di buffer
        // cari user berdasarkan id
        User.findById(data_id)
        .then(user => {

            // simpan buffer tadi di property avatar milik user
            user.avatar = buffer

            // simpan user
            user.save()
            .then(() => {
                res.send('Upload berhasil')
            })
        })
    })
})


// READ ALL USERS
app.get('/users', (req, res) => {

    User.find()
        .then(result => {
            // result: array of object
            res.send(result)
        })
})

// READ ONE USER BY ID
app.get('/users/:id', (req, res) => {
    const data_id = req.params.id

    // Search  by id
    User.findById(data_id)
        .then(user => {
            // user : {_id, name, password, email, age}

            // jika user tidak ditemukan
            if(!user){
                return res.send(`User dengan id ${data_id} tidak ditemukan`)
            }

            // jika user ditemukan
            res.send(user)
            
        }) 
})

// READ AVATAR
app.get('/users/:id/avatar', async (req, res) => {
    // get user, kirim foto
    const user = await User.findById(req.params.id)

    if(!user || !user.avatar){
        throw new Error('Foto / User tidak ada')
    }

    res.set('Content-Type', 'image/png')
    res.send(user.avatar) // default: ContentType : application/json
})

// UPDATE NAME BY ID
// Name, email, age, password
app.patch('/users/:id', (req, res) => {
    const data_id = req.params.id
    const data_newname = req.body.nameBaru

    User.findById(data_id)
        .then(user => {
            // user : {_id, name, password, email, age}

            if(!user){
                return res.send("User tidak di temukan")
            }

            // ubah nama dengan yang baru
            user.name = data_newname

            // simpan perubahan data
            user.save()
                .then(() => {
                    res.send('Update telah berhasil')
                })
            
        })
})

// DELETE USER BY ID
app.delete('/users/:id', (req, res) => {
    const data_id = req.params.id

    User.findByIdAndDelete(data_id)
        .then(user => {
            
            if(!user){
                return res.send("User tidak di temukan")
            }

            res.send({
                data: user,
                message: "User berhasil di hapus"
            })

        })
})

// YANG INI
// CREATE ONE TASK WITH USER ID
app.post('/tasks/:userid', (req, res) => {
    const data_desc = req.body.description
    const data_id = req.params.userid

    // Cari user berdasarkan id
    User.findById(data_id)
        .then(user => {
            // Jika user tidak ditemukan
            if(!user){
                res.send('Unable to create task')
            }

            // Membuat task {_id, desc, compl, owner}
            const task = new Task({
                description: data_desc,
                owner: data_id
            })

            // Masukkan id dari task yg sudah di buat ke array 'tasks' pada user
            user.tasks = user.tasks.concat(task._id)

            user.save()
                .then(() => {
                    task.save()
                        .then(() => {
                            res.send(task)
                        })
                })

        })
})

// YANG INI
// LOGIN USER
app.post('/users/login', async (req, res) => {
    const data_email = req.body.email
    const data_pass = req.body.password


    try {
        const hasil = await User.loginWithEmail(data_email, data_pass)
        res.send(hasil)
    } catch (error) { // Berasal dari throw di function loginWithEmail
        res.send(error.message)
    }

    
})

// YANG INI
// READ TASKS BY USER ID
app.get('/tasks/:userid', (req, res) => {

    // Mencari user berdasarkan Id
    User.findById(req.params.userid)
        .populate(
            {
                path: 'tasks',
                options: {
                    // sorting data secara descending berdasarkan field completed
                    // 1 = Ascending : false -> true
                    // -1 = Descending : true -> false
                    sort: {
                        completed: 1
                    }
                }
            }
        ).exec() // Mencari data ke tasks berdasarkan task id untuk kemudian di kirim sebagai respon
        .then(user => {
            // Jika user tidak ditemukan
            if(!user){
                res.send('Unable to read tasks')
            }

            // Kirim respon hanya untuk field (kolom) tasks
            res.send(user.tasks)

        })
})

// YANG INI
// UPDATE TASK BY USERID AND TASKID
app.patch('/tasks/:userid/:taskid', (req, res) => {
    const data_userid = req.params.userid
    const data_taskid = req.params.taskid
    // Menemukan user by id
    User.findById(data_userid)
        .then(user => {
            if(!user) {
                return res.send('User tidak ditemukan')
            }

            // Menemukan task by id
            Task.findOne({_id: data_taskid})
                .then(task => {
                    if(!task) {
                        return res.send('Task tidak ditemukan')
                    }

                    // Ubah nilai false menjadi true
                    task.completed = !task.completed

                    task.save()
                        .then(()=>{
                            res.send('Selesai dikerjakan')
                        })
                })
        })

})


// DELETE TASK BY ID
app.delete('/tasks', (req, res) => {
    const data_taskid = req.body.taskid

    // Menghapus satu task
    Task.findByIdAndDelete({_id: data_taskid})
        .then(result => {
            res.send(result)
        })

    // Menghilangkan id task yang sudah di hapus di user.tasks
    // latihan
})

// UPDATE ONE TASK BY ID
app.patch('/tasks/:id', (req, res) => {
    const data_id = req.params.id

    Task.findById(data_id)
        .then(task => {
            // task: {description, completed}
            task.completed = true

            task.save()
                .then(task => {
                    res.send(task)
                })
        })

})

// DELETE ONE TASK BY ID
app.delete('/tasks/:id', (req, res) => {
    const data_id = req.params.id

    Task.findByIdAndDelete(data_id)
        .then(task => {
            res.send(task)
        })
})

app.listen(port, () => {
    console.log('Berjalan di port ' + port)
})