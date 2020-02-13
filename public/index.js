
window.addEventListener('load', () => {
    if(!channel) return

    const converter = window.index.NumberToChineseWords
    const socket = io()
    const nicks = {}
    let firstDate = new Date()
    let lastDate = new Date(0)

    socket.on('connect', () => {
        socket.emit('join', {nick, channel})
        
        $('#chatlog').html('')
        fetchLog(channel)
    })

    $('#loadmore').click(() => {
        const yesterday = new Date(firstDate.getTime() - 1000*60*60*24)
        const date = yesterday.getFullYear() + '-' + new String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + yesterday.getDate()
        fetchLog(channel, date)
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

    const fetchLog = (channel, date=null) => {
        const double = channel.startsWith('##')
        const doublePrefix = double ? 'double/' : ''
        const channelName = channel.replace(/\#/g, '')

        $.ajax({
            url: '/logs/' + doublePrefix + channelName + '/' + (date ? date + '/' : ''),
            success: (data) => {
                prependLog(data)
            }
        })
    }

    const prependLog = (log) => {
        const messages = log.split('\n')
        let startDate = null
        let lastDate = new Date(0)
        let first = true

        for(const message of messages) {
            if(message.trim() != '') {
                const parsed = parseMessage(message, lastDate)

                if(first) {
                    startDate = parsed.date
                    if(startDate.getTime() < firstDate.getTime()) firstDate = startDate
                    lastDate = firstDate
                    first = false
                }

                console.log(startDate.toISOString(), firstDate.toISOString())

                if(lastDate && $('.message.' + lastDate.getTime()).length) $('.message.' + lastDate.getTime()).after(formatMessage(parsed))
                else $('#chatlog').prepend(formatMessage(parsed))

                lastDate = parsed.date

            }
        }
    }

    const appendMessage = (msg) => {
        const parsed = parseMessage(msg, lastDate)
        lastDate = parsed.date
        $('#chatlog').append(formatMessage(parsed))
    }

})
