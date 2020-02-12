
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const dateformat = require('dateformat')

const http = require('http')
const express = require('express')
const socketio = require('socket.io')

const {Liquid} = require('liquidjs')

const IRC = require('irc-framework')

const app = express()
const server = http.createServer(app)
const socket = socketio(server)
const liquid = new Liquid()

const port = process.env.PORT || 8080
const ircHost = process.env.IRC_HOST || 'irc.freenode.net'
const ircPort = process.env.IRC_PORT || 6667
const logbotNick = process.env.LOGBOT_NICK || 'logbot'
const channels = process.env.CHANNELS.split(',') || []
const basedir = process.env.BASE_DIR || process.cwd()
const logdir = process.env.LOG_DIR || 'logs'
const dirFormat = 'yyyy-mm-dd'

mkdirp.sync(path.join(basedir, logdir))

const logbot = new IRC.Client()
logbot.connect({
    host: ircHost,
    port: ircPort,
    nick: logbotNick,
})

logbot.on('registered', () => {
    channels.forEach(channel => logbot.join(channel))
})

logbot.on('message', (event) => {
    const {nick, target, message} = event
    if(!channels.includes(target)) return

    console.log(`[${target}] ${nick}: ${message}`)

    const double = target.startsWith('##')
    const channel = target.replace(/\#/g, '')
    const now = new Date()
    const date = dateformat(now, 'HH:MM:ss')
    
    const content = `${date} - ${nick}: ${message}\n`

    const dirname = double
            ? path.join(basedir, logdir, '_double', channel)
            : path.join(basedir, logdir, channel)
    mkdirp.sync(dirname)
    fs.appendFile(path.join(dirname, dateformat(now, dirFormat) + '.txt'), content, (err) => {
        if(err) console.error(err)
    })

})

app.set('view engine', 'html')
app.engine('html', liquid.express())

app.use(express.static('public'))
app.get('/', (req, res) => {
    res.render('index.html', {})
})

socket.on('connection', (conn) => {
    conn.on('message', (msg) => {
    })
    conn.on('disconnect', () => {
    })
})

server.listen(port, () => {
    console.log('listening on', port)
})
