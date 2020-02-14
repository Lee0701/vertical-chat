
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const dateformat = require('dateformat')
const randomstring = require('randomstring')

const http = require('http')
const express = require('express')
const socketio = require('socket.io')

const session = require('express-session')
const bodyParser = require('body-parser')
const {Liquid} = require('liquidjs')

const irc = require('irc')

const app = express()
const server = http.createServer(app)
const socket = socketio(server)
const liquid = new Liquid()

const port = process.env.PORT || 8080
const ircHost = process.env.IRC_HOST || 'irc.freenode.net'
const ircPort = process.env.IRC_PORT || 6667
const useSasl = process.env.USE_SASL == 'true'
const logbotNick = process.env.LOGBOT_NICK || 'logbot'
const logbotRealName = process.env.LOGBOT_REAL_NAME || logbotNick
const logbotPassword = process.env.LOGBOT_PASSWORD
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
    nicks[logbotNick] = logbotRealName
})
const saveNicks = () => fs.writeFileSync(path.join(basedir, logdir, 'nicks.json'), JSON.stringify(nicks))

const appendLog = (now, target, content) => {
    const double = target.startsWith('##')
    const channel = target.replace(/\#/g, '')

    const dirname = double
            ? path.join(basedir, logdir, '_double', channel)
            : path.join(basedir, logdir, channel)
    
    mkdirp.sync(dirname)

    fs.appendFile(path.join(dirname, dateformat(now, dirFormat) + extension), content, (err) => {
        if(err) console.error(err)
    })
}

const logbot = new irc.Client(ircHost, logbotNick, {
    port: ircPort,
    userName: logbotNick,
    realName: logbotRealName,
    sasl: useSasl,
    password: logbotPassword,
    channels: channels,
})

logbot.addListener('error', (err) => console.error(err))

logbot.addListener('registered', () => {
    console.log(logbotNick + ' is registered')
})

logbot.addListener('message', (nick, target, message) => {
    if(!channels.includes(target)) return

    console.log(`[${target}] ${nick}: ${message}`)

    const now = new Date()
    const date = dateformat(now, timeFormat)
    
    const content = `${date} - ${nick}: ${message}\n`

    appendLog(now, target, content)
})

logbot.addListener('join', (channel, nick) => {
    if(!channels.includes(channel)) return

    const now = new Date()
    const date = dateformat(now, timeFormat)
    
    const content = `${date} - ${nick} joined\n`
    appendLog(now, channel, content)
})

logbot.addListener('part', (channel, nick) => {
    if(!channels.includes(channel)) return

    const now = new Date()
    const date = dateformat(now, timeFormat)
    
    const content = `${date} - ${nick} quit\n`
    appendLog(now, channel, content)
})

logbot.addListener('quit', (nick) => {

    const now = new Date()
    const date = dateformat(now, timeFormat)
    
    const content = `${date} - ${nick} quit\n`
    channels.forEach(channel => appendLog(now, channel, content))
})

app.set('view engine', 'html')
app.engine('html', liquid.express())

const secret = randomstring.generate()
const sessionMiddleware = session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
})

app.use(sessionMiddleware)
app.use(bodyParser.urlencoded({extended : false}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
    const {nick, displaynick} = req.session
    const channel = req.session.channel || req.query.channel || '#'
    res.render('index.html', {nick, displaynick, channel})
})

app.post('/login', (req, res) => {
    const {nick, displaynick, password, channel} = req.body
    req.session.nick = nick
    req.session.displaynick = displaynick
    req.session.password = password
    req.session.channel = channel
    res.redirect('/')
})

app.get('/logout', (req, res) => {
    delete req.session.nick
    delete req.session.displaynick
    delete req.session.password
    delete req.session.channel
    res.redirect('/')
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
        if(err) res.status(404).send()
        else res.send(data.toString())
    })
}

socket.use((socket, next) => sessionMiddleware(socket.request, socket.request.res, next))

socket.on('connection', (conn) => {
    
    let client = null
    const {nick, displaynick, password, channel} = conn.request.session

    conn.emit('nick', nicks)

    conn.on('join', () => {
        if(!nick) return

        if(displaynick) nicks[nick] = displaynick
        saveNicks()
    
        client = new irc.Client(ircHost, nick, {
            port: ircPort,
            userName: nick,
            realName: displaynick || nick,
            sasl: (!password == false),
            password: password,
            channels: [channel],
        })

        client.addListener('registered', () => {
            conn.emit('registered', {})
        })

        client.addListener('message', (nick, target, message) => {
            const date = dateformat(new Date(), timeFormat)
            if(channel == target) {
                conn.emit('message', `${date} - ${nick}: ${message}\n`)
            }
        })

        client.addListener('join', (target, nick) => {
            const date = dateformat(new Date(), timeFormat)
            if(channel == target) {
                conn.emit('message', `${date} - ${nick} joined\n`)
            }
        })

        client.addListener('part', (target, nick) => {
            const date = dateformat(new Date(), timeFormat)
            if(channel == target) {
                conn.emit('message', `${date} - ${nick} quit\n`)
            }
        })

        client.addListener('quit', (nick) => {
            const date = dateformat(new Date(), timeFormat)
            conn.emit('message', `${date} - ${nick} quit\n`)
        })

        client.addListener('error', (err) => console.error(err))

    })

    conn.on('message', (msg) => {
        client.say(channel, msg)
        const date = dateformat(new Date(), timeFormat)
        conn.emit('message', `${date} - ${nick}: ${msg}\n`)
    })

    conn.on('disconnect', () => {
        if(client) client.disconnect()
    })

})

server.listen(port, () => {
    console.log('listening on', port)
})
