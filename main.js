
const http = require('http')
const express = require('express')
const socketio = require('socket.io')

const {Liquid} = require('liquidjs')

const app = express()
const server = http.createServer(app)
const socket = socketio(server)
const liquid = new Liquid()

const port = process.env.PORT || 8080

const clients = []

class Client {
    constructor(id) {
        this.id = id
        this.nick = null
    }
}

app.set('view engine', 'html')
app.engine('html', liquid.express())

app.use(express.static('public'))
app.get('/', (req, res) => {
    res.render('index.html', {})
})

const getSocket = (client) => socket.sockets.connected[client.id]

socket.on('connection', (conn) => {
    const client = new Client(conn.id)
    clients.push(client)
    conn.on('nick.change', (data) => {
        const nick = data.nick
        const duplicate = clients.find(client => client.nick == nick) == false
        if(duplicate) conn.emit('nick.change.deny', {reason: 'duplicate'})
        else {
            const old = client.nick
            client.nick = nick
            clients.forEach(client => {
                getSocket(client).emit('nick.update', {old, nick})
            })
        }
    })
    conn.on('chat.message', (data) => {
        const nick = client.nick
        const message = data.message.trim()
        if(!nick) return
        if(message == '') return
        clients.forEach(client => {
            getSocket(client).emit('chat.message', {nick, message})
        })
    })
    conn.on('disconnect', () => {
        clients.splice(clients.indexOf(client), 1)
    })
})

server.listen(port, () => {
    console.log('listening on', port)
})
