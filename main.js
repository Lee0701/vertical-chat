
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const dateformat = require('dateformat')

const http = require('http')
const express = require('express')
const socketio = require('socket.io')

const bodyParser = require('body-parser')
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
const extension = process.env.EXTENSION || '.txt'
const dirFormat = 'yyyy-mm-dd'
const timeFormat = 'yyyy-mm-dd HH:MM:ss'

mkdirp.sync(path.join(basedir, logdir))

let nicks = {}
fs.readFile(path.join(basedir, logdir, 'nicks.json'), (err, data) => {
    if(data) nicks = JSON.parse(data)
})
const saveNicks = () => fs.writeFileSync(path.join(basedir, logdir, 'nicks.json'), JSON.stringify(nicks))

const logbot = new IRC.Client()
logbot.connect({
    host: ircHost,
    port: ircPort,
    nick: logbotNick,
})

logbot.on('registered', () => {
    console.log(logbotNick + ' is registered')
    channels.forEach(channel => logbot.join(channel))
})

logbot.on('message', (event) => {
    const {nick, target, message} = event
    if(!channels.includes(target)) return

    console.log(`[${target}] ${nick}: ${message}`)

    const double = target.startsWith('##')
    const channel = target.replace(/\#/g, '')
    const now = new Date()
    const date = dateformat(now, timeFormat)
    
    const content = `${date} - ${nick}: ${message}\n`

    const dirname = double
            ? path.join(basedir, logdir, '_double', channel)
            : path.join(basedir, logdir, channel)
    mkdirp.sync(dirname)
    fs.appendFile(path.join(dirname, dateformat(now, dirFormat) + extension), content, (err) => {
        if(err) console.error(err)
    })

})

app.set('view engine', 'html')
app.engine('html', liquid.express())

app.use(bodyParser.urlencoded({extended : false}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
    const channel = req.query.channel || '#'
    res.render('index.html', {channel})
})

app.post('/', (req, res) => {
    const {nick, displaynick, channel} = req.body

    if(displaynick) nicks[nick] = displaynick
    saveNicks()
    
    res.render('index.html', {nick, channel})
})

app.get('/logs/:channel', (req, res) => {
    const channel = req.params.channel
    const date = dateformat(new Date(), dirFormat)
    sendLog(res, channel, date)
})

app.get('/logs/double/:channel', (req, res) => {
    const channel = req.params.channel
    const date = dateformat(new Date(), dirFormat)
    sendLog(res, channel, date, true)
})

app.get('/logs/:channel/:date', (req, res) => {
    const channel = req.params.channel
    const date = req.params.date
    sendLog(res, channel, date)
})

app.get('/logs/double/:channel/:date', (req, res) => {
    const channel = req.params.channel
    const date = req.params.date
    sendLog(res, channel, date, true)
})

const sendLog = (res, channel, date, double=false) => {
    const dirname = double
            ? path.join(basedir, logdir, '_double', channel)
            : path.join(basedir, logdir, channel)
    fs.readFile(path.join(dirname, date + extension), (err, data) => {
        if(err) res.status(404)
        else res.send(data.toString())
    })
}

socket.on('connection', (conn) => {
    let client = null
    let nick = null
    let channel = null

    conn.emit('nick', nicks)

    conn.on('join', (data) => {
        nick = data.nick

        client = new IRC.Client()
        client.connect({
            host: ircHost,
            port: ircPort,
            nick: data.nick,
            username: data.displaynick || data.nick,
        })

        client.on('error', (err) => {
            console.error(err)
        })

        client.on('close', () => {
            conn.emit('close', {})
        })

        client.on('registered', () => {
            if(channels.includes(data.channel)) {
                channel = client.channel(data.channel)
                channel.join()
            }
        })

        client.on('message', (data) => {
            const date = dateformat(new Date(), timeFormat)
            const {target, nick, message} = data
            if(channel && channel.name == target) {
                conn.emit('message', `${date} - ${nick}: ${message}\n`)
            }
        })

    })

    conn.on('message', (msg) => {
        if(channel) {
            channel.say(msg)
            const date = dateformat(new Date(), timeFormat)
            conn.emit('message', `${date} - ${nick}: ${msg}\n`)
        }
    })

    conn.on('disconnect', () => {
        if(client) client.quit()
    })

})

server.listen(port, () => {
    console.log('listening on', port)
})
