
window.addEventListener('load', () => {
    if(!channel) return

    const converter = window.index.NumberToChineseWords
    const socket = io()
    const nicks = {}
    let firstDate = new Date()
    let lastDate = new Date(0)
    
    const getYesterday = (date) => {
        return new Date((date || new Date()).getTime() - 1000*60*60*24)
    }

    const formatDate = (date) => {
        return date.getFullYear() + '-' + new String(date.getMonth() + 1).padStart(2, '0') + '-' + new String(date.getDate()).padStart(2, '0')
    }

    socket.on('connect', () => {
        socket.emit('join', {nick, channel})
        
        $('#chatlog').html('')
        fetchLog(channel)
    })

    $('#loadmore').click(() => {
        fetchLog(channel, formatDate(getYesterday(firstDate)))
    })

    $('#write').submit((event) => {
        event.preventDefault()
        const text = $('#message').val()
        if(text.trim() != '') socket.emit('message', text)
        $('#message').val('')
    })

    socket.on('nick', (data) => {
        for(key of Object.keys(data)) nicks[key] = data[key]
    })

    socket.on('message', (msg) => {
        appendMessage(msg)
    })

    socket.on('close', () => {
        // location.reload()
    })

    const convertDate = (date) => {
        const year = converter.toWords(date.getFullYear()) + '年'
        const month = converter.toWords(date.getMonth() + 1) + '月'
        const day = converter.toWords(date.getDate()) + '日'
        const hours = converter.toWords(date.getHours()) + '時'
        const minutes = converter.toWords(date.getMinutes()) + '分'
        const seconds = converter.toWords(date.getSeconds()) + '秒'
        return {year, month, day, hours, minutes, seconds}
    }

    const diffHanDate = (past, present) => {
        const hanDate = convertDate(present)
        let result = ''
        if(past.getYear() != present.getYear()) result += hanDate.year
        if(result || past.getMonth() != present.getMonth()) result += hanDate.month
        if(result || past.getDay() != present.getDay()) result += hanDate.day
        if(result || past.getHours() != present.getHours()) result += hanDate.hours
        if(result || past.getMinutes() != present.getMinutes()) result += hanDate.minutes
        // if(result || past.getSeconds() != present.getSeconds()) result += hanDate.seconds
        return result
    }

    const parseMessage = (msg, lastDate) => {
        const i1 = msg.indexOf(' - ')
        const i2 = msg.indexOf(': ')

        const time = msg.substring(0, i1)
        const date = new Date(Date.parse(time))
        const displayDate = diffHanDate(lastDate || date, date)
        const fullDate = diffHanDate(new Date(0), date)

        const nick = msg.substring(i1+3, i2)
        const displayNick = nicks[nick] || nick
        const text = msg.substring(i2 + 2)

        return {date, displayDate, fullDate, nick, displayNick, text}
    }

    const formatMessage = (parsed) => '<span class="message ' + parsed.date.getTime() + '">'
            + '<span class="date tooltip">' + parsed.displayDate + '<span class="tooltip-text">' + parsed.fullDate + '</span></span>'
            + '<span class="nick tooltip">' + parsed.displayNick + '<span class="tooltip-text">' + parsed.nick + '</span></span><span class="said">曰</span>'
            + '<span class="text">' + parsed.text + '</span>'
            + '</span>'

    const fetchLog = (channel, date=null, retry=10) => {
        const double = channel.startsWith('##')
        const doublePrefix = double ? 'double/' : ''
        const channelName = channel.replace(/\#/g, '')

        $.ajax({
            url: '/logs/' + doublePrefix + channelName + '/' + (date ? date + '/' : ''),
            success: (data) => {
                prependLog(data, true)
            },
            error: (req, status) => {
                if(retry) {
                    firstDate = getYesterday(firstDate)
                    fetchLog(channel, formatDate(firstDate), retry-1)
                }
            }
        })
    }

    const prependLog = (log, updateLastDate=false) => {
        const messages = log.split('\n')
        
        const group = $('<div class="group"></div>')

        let first = true
        for(const message of messages) {
            if(message.trim() != '') {
                const parsed = parseMessage(message, lastDate)

                group.append(formatMessage(parsed))

                if(updateLastDate) lastDate = parsed.date
                if(first) firstDate = parsed.date
                first = false
            }
        }
        $('#chatlog').prepend(group)
    }

    const appendMessage = (msg) => {
        const parsed = parseMessage(msg, lastDate)
        lastDate = parsed.date
        $('#chatlog').append(formatMessage(parsed))
    }

})
